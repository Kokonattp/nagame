import { NextRequest, NextResponse } from "next/server";
import { cached, cacheHeaders } from "@/lib/utils/cache";

type AssistantRequest = {
  cityName: string;
  prefecture?: string;
  prompt: string;
  weather?: {
    condition?: string;
    temperature?: number | null;
    rainChance?: number | null;
  };
  aqi?: {
    label?: string;
    aqi?: number | null;
  };
  events?: {
    title: string;
    publishedAt?: string;
  }[];
  recommendations?: {
    see: { title: string; note: string }[];
    eat: { title: string; note: string }[];
    sleep: { title: string; note: string }[];
  };
};

// เกราะกันคอสต์: จำกัดความยาวคำถาม, จำกัดจำนวนครั้งที่ยิงโมเดลต่อ IP,
// cache คำตอบของคำถามซ้ำ และตัด context ให้เล็กก่อนส่งเข้าโมเดล
const MAX_PROMPT_CHARS = 300;
const AI_RATE_WINDOW_MS = 60_000;
const AI_RATE_MAX_CALLS = 6;
const AI_REPLY_CACHE_SECONDS = 60 * 15;
const MAX_OUTPUT_TOKENS = 220;

const rateBuckets = new Map<string, number[]>();

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AssistantRequest;
  const prompt = body.prompt?.trim();

  if (!prompt) {
    return NextResponse.json(
      { error: "กรุณาพิมพ์คำถามก่อน", reply: null },
      { status: 400, headers: cacheHeaders(0) },
    );
  }

  if (prompt.length > MAX_PROMPT_CHARS) {
    return NextResponse.json(
      { error: `คำถามยาวเกินไป (จำกัด ${MAX_PROMPT_CHARS} ตัวอักษร)`, reply: null },
      { status: 400, headers: cacheHeaders(0) },
    );
  }

  const hasAiKey = Boolean(process.env.AI_API_KEY || process.env.GEMINI_API_KEY);
  let reply: string | null = null;

  if (hasAiKey && takeAiBudget(getClientIp(request))) {
    reply = await getCachedAiReply(body, prompt);
  }

  reply ??= buildFallbackReply(body);

  return NextResponse.json({ reply }, { headers: cacheHeaders(0) });
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

async function getCachedAiReply(body: AssistantRequest, prompt: string) {
  const rainBucket = typeof body.weather?.rainChance === "number" ? Math.round(body.weather.rainChance / 20) : "na";
  const cacheKey = `assistant:${body.cityName}:${rainBucket}:${prompt.toLowerCase()}`;

  try {
    // loader โยน error เมื่อโมเดลตอบไม่สำเร็จ เพื่อไม่ให้ cache ค่า null ค้างไว้
    return await cached(cacheKey, AI_REPLY_CACHE_SECONDS, async () => {
      const reply = await requestAiReply(body, prompt);
      if (!reply) throw new Error("AI reply unavailable");
      return reply;
    });
  } catch {
    return null;
  }
}

function buildCompactContext(body: AssistantRequest) {
  const compactItems = (items?: { title: string; note: string }[]) =>
    items?.slice(0, 4).map((item) => ({ title: item.title, note: item.note.slice(0, 120) })) ?? [];

  return {
    city: body.cityName,
    prefecture: body.prefecture,
    weather: body.weather ?? null,
    aqi: body.aqi ?? null,
    events: body.events?.slice(0, 3).map((item) => item.title) ?? [],
    recommendations: {
      see: compactItems(body.recommendations?.see),
      eat: compactItems(body.recommendations?.eat),
      sleep: compactItems(body.recommendations?.sleep),
    },
  };
}

const SYSTEM_PROMPT =
  "You are a concise Thai travel assistant for Japan. Use only the provided context. Never invent current facts, timings, prices, or operating hours. Answer in Thai within 120 words.";

async function requestAiReply(body: AssistantRequest, prompt: string) {
  const userContent = JSON.stringify({ question: prompt, context: buildCompactContext(body) });

  if (process.env.AI_API_KEY) {
    const reply = await requestOpenAiReply(userContent);
    if (reply) return reply;
  }

  if (process.env.GEMINI_API_KEY) {
    const reply = await requestGeminiReply(userContent);
    if (reply) return reply;
  }

  return null;
}

async function requestOpenAiReply(userContent: string) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.3,
      }),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

async function requestGeminiReply(userContent: string) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userContent }],
            },
          ],
          generationConfig: {
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            temperature: 0.3,
          },
        }),
      },
    );

    if (!response.ok) return null;
    const data = (await response.json()) as {
      candidates?: {
        content?: {
          parts?: { text?: string }[];
        };
      }[];
    };

    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
}

function buildFallbackReply(body: AssistantRequest) {
  const lowerPrompt = body.prompt.toLowerCase();
  const see = body.recommendations?.see ?? [];
  const eat = body.recommendations?.eat ?? [];
  const sleep = body.recommendations?.sleep ?? [];
  const rainChance = body.weather?.rainChance ?? null;
  const rainHigh = typeof rainChance === "number" && rainChance >= 60;
  const weatherLine = body.weather?.condition
    ? `ตอนนี้ ${body.cityName} อากาศ${body.weather.condition}${typeof body.weather.temperature === "number" ? ` ราว ${body.weather.temperature}°C` : ""}${typeof rainChance === "number" ? ` และโอกาสฝน ${rainChance}%` : ""}.`
    : `ตอนนี้ยังไม่มี weather context ครบสำหรับ ${body.cityName}.`;

  if (lowerPrompt.includes("ครึ่งวัน") || lowerPrompt.includes("half day")) {
    const firstSee = see[0];
    const meal = eat[0];
    const backup =
      (rainHigh
        ? see.find((item) => /museum|cultural|indoor|canal/i.test(item.title) || /ในร่ม|ปลอดฝน|สำรองวันฝน/.test(item.note))
        : null) ??
      see[1] ??
      see[0];

    return [
      weatherLine,
      rainHigh ? "วันนี้ฝนมีสิทธิ์มา แผนครึ่งวันควรยืดหยุ่นและเริ่มจากจุดที่เปลี่ยนแผนง่าย" : "แผนครึ่งวันแบบไม่เร่งมากสามารถจัดได้ประมาณนี้",
      firstSee ? `1. เริ่มจาก ${firstSee.title} เพราะ ${firstSee.note}` : null,
      meal ? `2. ต่อด้วยมื้อหลักที่ ${meal.title} เพราะ ${meal.note}` : null,
      backup ? `3. ปิดท้ายด้วย ${backup.title} เพื่อคุมจังหวะวันให้ยังสบาย` : null,
      sleep[0] ? `ถ้าจะอยู่ต่อถึงค่ำ ย่านพักที่น่าดูเป็นตัวแรกคือ ${sleep[0].title}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (lowerPrompt.includes("ฝน") || lowerPrompt.includes("rain")) {
    const picks = (
      rainHigh
        ? see.filter((item) => /museum|cultural|indoor|canal/i.test(item.title) || /ในร่ม|ปลอดฝน|สำรองวันฝน/.test(item.note))
        : see
    )
      .slice(0, 3)
      .map((item) => `- ${item.title}: ${item.note}`);

    return [weatherLine, "ถ้ากังวลเรื่องฝน ให้เริ่มจากตัวเลือกนี้ก่อน:", ...picks].join("\n");
  }

  if (lowerPrompt.includes("กิน") || lowerPrompt.includes("eat") || lowerPrompt.includes("อาหาร")) {
    const picks = eat.slice(0, 3).map((item) => `- ${item.title}: ${item.note}`);
    return [weatherLine, "ถ้าจะโฟกัสเรื่องกิน แนะนำเริ่มจาก:", ...picks].join("\n");
  }

  if (lowerPrompt.includes("นอน") || lowerPrompt.includes("พัก") || lowerPrompt.includes("hotel") || lowerPrompt.includes("sleep")) {
    const picks = sleep.slice(0, 3).map((item) => `- ${item.title}: ${item.note}`);
    return [weatherLine, "ถ้าจะเลือกย่านพัก ให้ดูตัวเลือกนี้ก่อน:", ...picks].join("\n");
  }

  if (lowerPrompt.includes("ไปไหน") || lowerPrompt.includes("เที่ยว") || lowerPrompt.includes("see") || lowerPrompt.includes("visit")) {
    const picks = see.slice(0, 3).map((item) => `- ${item.title}: ${item.note}`);
    return [weatherLine, "จุดที่เหมาะกับจังหวะวันวันนี้:", ...picks].join("\n");
  }

  const eventLine = body.events?.[0]?.title
    ? `ข่าวหรืออีเวนต์ล่าสุดที่ feed เจอคือ “${body.events[0].title}”.`
    : "ตอนนี้ feed ข่าวยังไม่แน่นพอ จึงควรใช้คู่กับลิงก์ข่าวด้านบน.";
  const airLine = body.aqi?.label
    ? `คุณภาพอากาศอยู่ระดับ ${body.aqi.label}${typeof body.aqi.aqi === "number" ? ` (AQI ${body.aqi.aqi})` : ""}.`
    : "";

  return [
    weatherLine,
    airLine,
    eventLine,
    `ตอนนี้ AI ส่วนนี้ยังทำงานแบบใช้ข้อมูลในหน้าและกฎสรุปอัตโนมัติก่อน ถ้าคุณถามแนว “กิน”, “เที่ยว”, “พัก”, “ฝนตกทำอะไรดี” หรือ “จัดแผนครึ่งวัน” ผมจะตอบเจาะขึ้นสำหรับ ${body.cityName}`,
  ]
    .filter(Boolean)
    .join("\n");
}
