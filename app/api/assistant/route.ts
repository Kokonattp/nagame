import { NextRequest, NextResponse } from "next/server";
import { getAdvisorChatReply } from "@/lib/services/advisor";
import { resolveCity } from "@/lib/services/geocode";
import { cached, cacheHeaders } from "@/lib/utils/cache";
import type { ChatReply } from "@/lib/chat/types";

type AssistantRequest = {
  /** optional ตั้งแต่ Phase 0 U7 — หน้าแรกถามได้โดยยังไม่เลือกเมือง (ตอบระดับประเทศ) */
  citySlug?: string;
  prompt: string;
};

// เกราะกันคอสต์: จำกัดความยาวคำถาม, จำกัดจำนวนครั้งที่ยิงโมเดลต่อ IP,
// และ cache คำตอบของคำถามซ้ำ ตัว advisor ดึง signal ฝั่ง server เอง —
// client ส่งแค่เมืองกับคำถาม ไม่ต้องเชื่อ context ที่ client ยัดมา
const MAX_PROMPT_CHARS = 300;
const AI_RATE_WINDOW_MS = 60_000;
const AI_RATE_MAX_CALLS = 6;
const AI_REPLY_CACHE_SECONDS = 60 * 15;
// ถามระดับประเทศ (citySlug ว่าง) ไม่ยิง LLM เลย (ดู buildCountryLevelReply) —
// cache นานกว่าได้เพราะ season data เปลี่ยนช้า และไม่กินโควตา AI budget ต่อ IP
const COUNTRY_REPLY_CACHE_SECONDS = 60 * 60;

const rateBuckets = new Map<string, number[]>();

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AssistantRequest;
  const prompt = body.prompt?.trim();
  const citySlugRaw = body.citySlug?.trim();

  if (!prompt) {
    return NextResponse.json({ error: "กรุณาพิมพ์คำถามก่อน", reply: null }, { status: 400, headers: cacheHeaders(0) });
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return NextResponse.json(
      { error: `คำถามยาวเกินไป (จำกัด ${MAX_PROMPT_CHARS} ตัวอักษร)`, reply: null },
      { status: 400, headers: cacheHeaders(0) },
    );
  }

  // ไม่มี citySlug → ถามระดับประเทศ (หน้าแรก = แชท, Phase 0 U7) ไม่ 400 อีกต่อไป
  if (!citySlugRaw) {
    const reply = await getCountryReply(prompt);
    return NextResponse.json({ reply }, { headers: cacheHeaders(0) });
  }

  const city = await resolveCity(citySlugRaw);
  if (!city) {
    return NextResponse.json({ error: "ไม่รู้จักเมืองนี้", reply: null }, { status: 404, headers: cacheHeaders(0) });
  }

  const reply = await getCityReply(city.slug, prompt, getClientIp(request));
  return NextResponse.json({ reply }, { headers: cacheHeaders(0) });
}

// rate-limit คุมการยิงโมเดล — เกินโควตา → allowLlm=false → intent+compose เป็น rule-based
// ทั้งคู่ ไม่ยิง LLM เลย (Fable B3: เดิม comment บอก rule-based แต่โค้ดยังยิง LLM 2 calls). cards ยังออกปกติ
async function getCityReply(citySlug: string, prompt: string, ip: string): Promise<ChatReply> {
  const cacheKey = `assistant:v2:${citySlug}:${prompt.toLowerCase()}`;

  if (!takeAiBudget(ip)) {
    return getAdvisorChatReply(citySlug, prompt, false);
  }

  try {
    return await cached(cacheKey, AI_REPLY_CACHE_SECONDS, () => getAdvisorChatReply(citySlug, prompt, true));
  } catch {
    return getAdvisorChatReply(citySlug, prompt, false);
  }
}

async function getCountryReply(prompt: string): Promise<ChatReply> {
  const cacheKey = `assistant:v2:country:${prompt.toLowerCase()}`;
  try {
    return await cached(cacheKey, COUNTRY_REPLY_CACHE_SECONDS, () => getAdvisorChatReply(null, prompt));
  } catch {
    return getAdvisorChatReply(null, prompt);
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
