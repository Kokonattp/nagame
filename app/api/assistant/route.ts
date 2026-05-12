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

  return NextResponse.json({ reply }, { headers: cacheHeaders(0) });
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
