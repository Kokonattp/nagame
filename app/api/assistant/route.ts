import { NextRequest, NextResponse } from "next/server";
import { cacheHeaders } from "@/lib/utils/cache";

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

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AssistantRequest;
  const prompt = body.prompt?.trim();

  if (!prompt) {
    return NextResponse.json(
      { error: "กรุณาพิมพ์คำถามก่อน", reply: null },
      { status: 400, headers: cacheHeaders(0) },
    );
  }

  const aiReply = process.env.AI_API_KEY ? await requestOpenAiReply(body) : null;
  const reply = aiReply ?? buildFallbackReply(body);

  return NextResponse.json(
    { reply },
    { headers: cacheHeaders(0) },
  );
}

async function requestOpenAiReply(body: AssistantRequest) {
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
          {
            role: "system",
            content:
              "You are a concise Thai travel assistant for Japan. Use only the provided context. Never invent current facts, timings, prices, or operating hours.",
          },
          {
            role: "user",
            content: JSON.stringify(body),
          },
        ],
        max_tokens: 220,
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

function buildFallbackReply(body: AssistantRequest) {
  const lowerPrompt = body.prompt.toLowerCase();
  const weatherLine = body.weather?.condition
    ? `ตอนนี้ ${body.cityName} อากาศ${body.weather.condition}${typeof body.weather.temperature === "number" ? ` ราว ${body.weather.temperature}°C` : ""}${typeof body.weather.rainChance === "number" ? ` และโอกาสฝน ${body.weather.rainChance}%` : ""}.`
    : `ตอนนี้ยังไม่มี weather context ครบสำหรับ ${body.cityName}.`;

  if (lowerPrompt.includes("กิน") || lowerPrompt.includes("eat") || lowerPrompt.includes("อาหาร")) {
    const picks = body.recommendations?.eat?.slice(0, 3).map((item) => `- ${item.title}: ${item.note}`) ?? [];
    return [weatherLine, "ถ้าจะโฟกัสเรื่องกิน แนะนำเริ่มจาก:", ...picks].join("\n");
  }

  if (lowerPrompt.includes("นอน") || lowerPrompt.includes("พัก") || lowerPrompt.includes("hotel") || lowerPrompt.includes("sleep")) {
    const picks = body.recommendations?.sleep?.slice(0, 3).map((item) => `- ${item.title}: ${item.note}`) ?? [];
    return [weatherLine, "ถ้าจะเลือกย่านพัก ให้ดูตัวเลือกนี้ก่อน:", ...picks].join("\n");
  }

  if (lowerPrompt.includes("ไปไหน") || lowerPrompt.includes("เที่ยว") || lowerPrompt.includes("see") || lowerPrompt.includes("visit")) {
    const picks = body.recommendations?.see?.slice(0, 3).map((item) => `- ${item.title}: ${item.note}`) ?? [];
    return [weatherLine, "จุดที่เหมาะกับจังหวะวันวันนี้:", ...picks].join("\n");
  }

  const eventLine = body.events?.[0]?.title
    ? `ข่าว/อีเวนต์ล่าสุดที่ feed เจอคือ “${body.events[0].title}”.`
    : "ตอนนี้ feed ข่าวยังไม่แน่นพอ จึงควรใช้ควบคู่กับลิงก์ event ด้านบน.";
  const airLine = body.aqi?.label
    ? `คุณภาพอากาศอยู่ระดับ ${body.aqi.label}${typeof body.aqi.aqi === "number" ? ` (AQI ${body.aqi.aqi})` : ""}.`
    : "";

  return [
    weatherLine,
    airLine,
    eventLine,
    `ถ้าคุณบอกเพิ่มว่าอยากเน้น “กิน”, “เที่ยว”, “พัก”, “ฝนตกทำอะไรดี” หรือ “จัดแผนครึ่งวัน” ผมจะสรุปให้ต่อจากข้อมูลของ ${body.cityName} ได้เลย`,
  ]
    .filter(Boolean)
    .join("\n");
}
