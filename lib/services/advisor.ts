import { getCityConfigBySlug } from "@/lib/cities/city-configs";
import { japanHolidayWindows, windowStatus } from "@/lib/cities/holidays";
import { getCitySeasons } from "@/lib/cities/seasons";
import { getCityTransit } from "@/lib/cities/transit";
import { getRecommendationSets } from "@/lib/cities/travel-meta";
import { getAqi } from "@/lib/services/aqi";
import { getEvents } from "@/lib/services/events";
import { resolveCity } from "@/lib/services/geocode";
import { getWarnings } from "@/lib/services/warnings";
import { getWeather } from "@/lib/services/weather";

// อาแป๊ะตอบเป็น 1 LLM call: parseIntent (โค้ด) → รวม signal ฝั่ง server → compose.
// intent parser เป็น pure function คืน contract เดิม {period, wantsFlights} —
// ถ้าวันหน้าย้ายแชทออกจากหน้าเมือง (city ไม่รู้ล่วงหน้า) ค่อยสลับไส้เป็น LLM call
// โดยไม่ต้องแตะ compose หรือ endpoint.

export type TripPeriod = "now" | "morning" | "afternoon" | "evening" | "unspecified";

export type AdvisorIntent = {
  period: TripPeriod;
  wantsFlights: boolean;
};

export type AdvisorResult = {
  reply: string;
  source: "AI advisor" | "Rule-based advisor";
};

type Recommendation = { title: string; note: string };

type AdvisorContext = {
  cityName: string;
  prefecture?: string;
  weather: Awaited<ReturnType<typeof getWeather>>;
  aqi: Awaited<ReturnType<typeof getAqi>>;
  events: Awaited<ReturnType<typeof getEvents>>;
  warnings: Awaited<ReturnType<typeof getWarnings>>;
  activeSeasons: string[];
  holidayName: string | null;
  stationName?: string;
  recommendations: {
    see: Recommendation[];
    eat: Recommendation[];
    sleep: Recommendation[];
  };
};

const PERIOD_PATTERNS: { period: TripPeriod; test: RegExp }[] = [
  { period: "morning", test: /เช้า|ตอนเช้า|morning/i },
  { period: "afternoon", test: /บ่าย|กลางวัน|afternoon|noon/i },
  { period: "evening", test: /เย็น|ค่ำ|กลางคืน|evening|night|dinner/i },
  { period: "now", test: /ตอนนี้|เดี๋ยวนี้|now|right now/i },
];

// intent parser แบบ deterministic — city รู้จากหน้าอยู่แล้ว เหลือแค่ช่วงเวลา+ตั๋ว
export function parseIntent(prompt: string): AdvisorIntent {
  const period = PERIOD_PATTERNS.find((entry) => entry.test.test(prompt))?.period ?? "unspecified";
  const wantsFlights = /ตั๋ว|เที่ยวบิน|บิน|flight|airfare/i.test(prompt);
  return { period, wantsFlights };
}

export async function getAdvisorReply(citySlug: string, prompt: string): Promise<AdvisorResult> {
  const context = await gatherContext(citySlug);
  const intent = parseIntent(prompt);

  const hasAiKey = Boolean(process.env.AI_API_KEY || process.env.GEMINI_API_KEY);
  if (hasAiKey) {
    const aiReply = await composeAiReply(context, intent, prompt);
    if (aiReply) return { reply: aiReply, source: "AI advisor" };
  }

  return { reply: buildFallbackReply(context, intent, prompt), source: "Rule-based advisor" };
}

// คำทักทายเปิดหน้าของอาแป๊ะ — คำนวณฝั่ง server ครั้งเดียว ส่งเป็น prop ให้ hero
// (seed เป็นข้อความแรกของแชท → คนเข้ามายังไม่พิมพ์ก็เห็น "คำตอบ" ทันที).
// zero-LLM ในโหมด local; ถ้ามี AI key ค่อยยิง compose หนึ่งครั้งตอน build/revalidate.
// PERF: gatherContext ยิง weather/aqi/events/warnings ซ้ำกับ page.tsx แต่ทุกตัว
// ห่อ cached() (TTL 10-30 นาที) → เป็น cache hit ในหน้าเดียวกัน ไม่ใช่ network ซ้ำ.
// อาศัย revalidate=600 ของเพจ ทำให้ทั้งหน้า render ไม่เกิน 1 ครั้ง/10 นาที/เมือง.
export async function getCityVerdict(citySlug: string): Promise<string> {
  const context = await gatherContext(citySlug);
  if (!context) return `สวัสดีครับ ยังไม่รู้จักเมืองนี้ ลองเลือกเมืองจากหน้าแรกอีกครั้งนะครับ`;

  const intent: AdvisorIntent = { period: "now", wantsFlights: false };
  const opener = `ช่วงนี้เที่ยว ${context.cityName} ดีไหม อาแป๊ะช่วยดูให้`;

  const hasAiKey = Boolean(process.env.AI_API_KEY || process.env.GEMINI_API_KEY);
  if (hasAiKey) {
    const aiReply = await composeAiReply(context, intent, opener);
    if (aiReply) return aiReply;
  }

  return buildVerdictReply(context);
}

// คำทักทายแบบกฎ — โปรแอ็กทีฟ (ไม่ใช่ถาม-ตอบ) สรุปภาพรวมวันนี้ให้ครบในย่อหน้าเดียว
function buildVerdictReply(context: AdvisorContext): string {
  const lead: string[] = [];
  const severe = context.warnings.items.find((item) => item.level !== "advisory");
  if (severe) lead.push(`⚠ มีประกาศเตือน${severe.label}อยู่ เช็กก่อนออกนอกที่พักนะครับ`);
  if (context.holidayName) lead.push(`ช่วงนี้เป็น${context.holidayName} คนเยอะ ที่พัก/รถไฟควรจองล่วงหน้า`);

  const rainChance = context.weather.rainChance;
  const weatherLine = context.weather.available
    ? `ตอนนี้ ${context.cityName} ${context.weather.condition}${typeof context.weather.temperature === "number" ? ` ราว ${context.weather.temperature}°C` : ""}${typeof rainChance === "number" ? ` โอกาสฝน ${rainChance}%` : ""}.`
    : `ตอนนี้ยังดึงข้อมูลอากาศของ ${context.cityName} ไม่ครบ.`;

  const seasonLine = context.activeSeasons.length
    ? `กำลังเป็นช่วง${context.activeSeasons.slice(0, 2).join(" และ ")} พอดี.`
    : "";

  const rainHigh = typeof rainChance === "number" && rainChance >= 60;
  const firstPick = context.recommendations.see[0]?.title;
  const closer = rainHigh
    ? "ฝนมีสิทธิ์มา เริ่มจากจุดในร่มหรือที่เปลี่ยนแผนง่ายก่อนดีกว่าครับ — แผนเต็มวันดูข้างล่างได้เลย 👇"
    : firstPick
      ? `ถ้าให้เริ่ม แนะนำ ${firstPick} ก่อน — แผนเต็มวันอยู่ข้างล่าง ถามต่อได้เลยครับ 👇`
      : "อยากได้แผนแบบไหนบอกอาแป๊ะได้เลยครับ 👇";

  return [`สวัสดีครับ 👋`, ...lead, [weatherLine, seasonLine].filter(Boolean).join(" "), closer]
    .filter(Boolean)
    .join("\n");
}

async function gatherContext(citySlug: string): Promise<AdvisorContext | null> {
  const city = await resolveCity(citySlug);
  if (!city) return null;

  const config = getCityConfigBySlug(city.slug);
  const [weather, aqi, events, warnings] = await Promise.all([
    getWeather(city.lat, city.lon),
    getAqi(city.lat, city.lon),
    getEvents(config),
    getWarnings({ slug: city.slug, prefecture: city.prefecture }),
  ]);

  const sets = getRecommendationSets(city.name, city.prefecture, config?.recommendations ?? []);
  const activeSeasons = getCitySeasons(city.slug)
    .filter((season) => windowStatus(season.from, season.to).state === "active")
    .map((season) => season.name);
  const holidayName =
    japanHolidayWindows.find((window) => windowStatus(window.from, window.to).state === "active")?.name ?? null;

  const compact = (items: { title: string; note: string }[]) =>
    items.slice(0, 6).map((item) => ({ title: item.title, note: item.note.slice(0, 120) }));

  return {
    cityName: city.name,
    prefecture: city.prefecture,
    weather,
    aqi,
    events,
    warnings,
    activeSeasons,
    holidayName,
    stationName: getCityTransit(city.slug)?.station.name,
    recommendations: {
      see: compact(sets.see),
      eat: compact(sets.eat),
      sleep: compact(sets.sleep),
    },
  };
}

const MAX_OUTPUT_TOKENS = 220;
const SYSTEM_PROMPT =
  "You are อาแป๊ะ, a warm but concise Thai travel advisor for Japan. Use only the provided context. Never invent current facts, timings, prices, or operating hours. Give ONE clear recommendation the traveller can act on, in Thai within 120 words. If a weather warning is active, lead with it.";

async function composeAiReply(context: AdvisorContext | null, intent: AdvisorIntent, prompt: string): Promise<string | null> {
  if (!context) return null;

  const rainByPeriod = context.weather.rainByPeriod;
  const focusRain =
    intent.period === "morning" || intent.period === "afternoon" || intent.period === "evening"
      ? rainByPeriod[intent.period]
      : context.weather.rainChance;

  const userContent = JSON.stringify({
    question: prompt,
    focusPeriod: intent.period,
    context: {
      city: context.cityName,
      prefecture: context.prefecture,
      weather: context.weather.available
        ? {
            condition: context.weather.condition,
            temperature: context.weather.temperature,
            rainChanceForPeriod: focusRain,
            rainByPeriod,
          }
        : null,
      aqi: context.aqi.available ? { label: context.aqi.label, aqi: context.aqi.aqi } : null,
      activeWarnings: context.warnings.items.map((item) => item.label),
      activeSeasons: context.activeSeasons,
      holiday: context.holidayName,
      events: context.events.items.slice(0, 3).map((item) => item.title),
      recommendations: context.recommendations,
    },
  });

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

async function requestOpenAiReply(userContent: string): Promise<string | null> {
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
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

async function requestGeminiReply(userContent: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: userContent }] }],
          generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0.3 },
        }),
      },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
}

// ไม่มี AI key หรือโมเดลตอบเสีย — ตอบด้วยกฎจากข้อมูลที่ดึงมาแล้ว ให้เสมอ
function buildFallbackReply(context: AdvisorContext | null, intent: AdvisorIntent, prompt: string): string {
  if (!context) return "ยังไม่รู้จักเมืองนี้ ลองเลือกเมืองจากหน้าแรกอีกครั้งนะครับ";

  const lower = prompt.toLowerCase();
  const { see, eat, sleep } = context.recommendations;
  const rainByPeriod = context.weather.rainByPeriod;
  const rainChance =
    intent.period === "morning" || intent.period === "afternoon" || intent.period === "evening"
      ? rainByPeriod[intent.period]
      : context.weather.rainChance;
  const rainHigh = typeof rainChance === "number" && rainChance >= 60;

  const lead: string[] = [];
  const severe = context.warnings.items.find((item) => item.level !== "advisory");
  if (severe) lead.push(`มีประกาศเตือน${severe.label}อยู่ เช็กก่อนออกนอกที่พักนะครับ`);
  if (context.holidayName) lead.push(`ช่วงนี้เป็น${context.holidayName} คนเยอะ ที่พัก/รถไฟควรจองล่วงหน้า`);

  const weatherLine = context.weather.available
    ? `ตอนนี้ ${context.cityName} ${context.weather.condition}${typeof context.weather.temperature === "number" ? ` ราว ${context.weather.temperature}°C` : ""}${typeof rainChance === "number" ? ` โอกาสฝน ${rainChance}%` : ""}.`
    : `ตอนนี้ยังไม่มีข้อมูลอากาศครบสำหรับ ${context.cityName}.`;

  const indoorish = (item: Recommendation) => /museum|cultural|indoor|canal|ในร่ม|ปลอดฝน|สำรองวันฝน|ตลาด|ช้อป/i.test(`${item.title} ${item.note}`);
  const bullet = (items: Recommendation[]) => items.slice(0, 3).map((item) => `- ${item.title}: ${item.note}`);

  let body: string[];
  if (lower.includes("กิน") || lower.includes("eat") || lower.includes("อาหาร")) {
    body = ["ถ้าจะโฟกัสเรื่องกิน เริ่มจากนี่ก่อน:", ...bullet(eat)];
  } else if (lower.includes("นอน") || lower.includes("พัก") || lower.includes("hotel") || lower.includes("sleep")) {
    body = ["ถ้าจะเลือกย่านพัก ดูตัวเลือกนี้ก่อน:", ...bullet(sleep)];
  } else if (rainHigh || lower.includes("ฝน") || lower.includes("rain")) {
    const picks = see.filter(indoorish);
    body = ["ฝนช่วงนี้มีสิทธิ์มา เริ่มจากจุดที่เปลี่ยนแผนง่าย/อยู่ในร่มก่อน:", ...bullet(picks.length ? picks : see)];
  } else {
    body = ["จุดที่เข้ากับจังหวะวันนี้:", ...bullet(see)];
  }

  return [...lead, weatherLine, ...body].filter(Boolean).join("\n");
}
