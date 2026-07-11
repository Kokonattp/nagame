import { NextRequest, NextResponse } from "next/server";
import { getAdvisorReply } from "@/lib/services/advisor";
import { resolveCity } from "@/lib/services/geocode";
import { cached, cacheHeaders } from "@/lib/utils/cache";

type AssistantRequest = {
  citySlug: string;
  prompt: string;
};

// เกราะกันคอสต์: จำกัดความยาวคำถาม, จำกัดจำนวนครั้งที่ยิงโมเดลต่อ IP,
// และ cache คำตอบของคำถามซ้ำ ตัว advisor ดึง signal ฝั่ง server เอง —
// client ส่งแค่เมืองกับคำถาม ไม่ต้องเชื่อ context ที่ client ยัดมา
const MAX_PROMPT_CHARS = 300;
const AI_RATE_WINDOW_MS = 60_000;
const AI_RATE_MAX_CALLS = 6;
const AI_REPLY_CACHE_SECONDS = 60 * 15;

const rateBuckets = new Map<string, number[]>();

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AssistantRequest;
  const prompt = body.prompt?.trim();
  const citySlug = body.citySlug?.trim();

  if (!prompt) {
    return NextResponse.json({ error: "กรุณาพิมพ์คำถามก่อน", reply: null }, { status: 400, headers: cacheHeaders(0) });
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return NextResponse.json(
      { error: `คำถามยาวเกินไป (จำกัด ${MAX_PROMPT_CHARS} ตัวอักษร)`, reply: null },
      { status: 400, headers: cacheHeaders(0) },
    );
  }
  if (!citySlug) {
    return NextResponse.json({ error: "ยังไม่รู้ว่าถามถึงเมืองไหน", reply: null }, { status: 400, headers: cacheHeaders(0) });
  }

  const city = await resolveCity(citySlug);
  if (!city) {
    return NextResponse.json({ error: "ไม่รู้จักเมืองนี้", reply: null }, { status: 404, headers: cacheHeaders(0) });
  }

  const reply = await getReply(city.slug, prompt, getClientIp(request));
  return NextResponse.json({ reply }, { headers: cacheHeaders(0) });
}

// rate-limit คุมเฉพาะการยิงโมเดล — เกินโควตายังตอบได้ด้วย rule-based ของ advisor
async function getReply(citySlug: string, prompt: string, ip: string): Promise<string> {
  const cacheKey = `assistant:${citySlug}:${prompt.toLowerCase()}`;

  if (!takeAiBudget(ip)) {
    return (await getAdvisorReply(citySlug, prompt)).reply;
  }

  try {
    return await cached(cacheKey, AI_REPLY_CACHE_SECONDS, async () => (await getAdvisorReply(citySlug, prompt)).reply);
  } catch {
    return (await getAdvisorReply(citySlug, prompt)).reply;
  }
}

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function takeAiBudget(ip: string) {
  if (rateBuckets.size > 5000) rateBuckets.clear();

  const now = Date.now();
  const bucket = (rateBuckets.get(ip) ?? []).filter((time) => now - time < AI_RATE_WINDOW_MS);

  if (bucket.length >= AI_RATE_MAX_CALLS) {
    rateBuckets.set(ip, bucket);
    return false;
  }

  bucket.push(now);
  rateBuckets.set(ip, bucket);
  return true;
}
