import type { Recommendation } from "@/lib/cities/city-configs";
import type { WeatherSignal } from "@/lib/services/weather";
import type { WarningSignal } from "@/lib/services/warnings";
import { cached } from "@/lib/utils/cache";

export type DayPlanSlot = "morning" | "afternoon" | "evening";

export type DayPlanPeriod = {
  slot: DayPlanSlot;
  label: string;
  rainChance: number | null;
  reason: string;
  items: {
    title: string;
    area: string;
    kind: Recommendation["kind"];
  }[];
};

export type DayPlanSignal = {
  available: boolean;
  source: string;
  context: string;
  periods: DayPlanPeriod[];
  routeUrl: string | null;
  updatedAt: string;
  message?: string;
};

export type DayPlanInput = {
  cityName: string;
  citySlug: string;
  stationName?: string;
  weather: WeatherSignal;
  warnings: WarningSignal;
  activeSeasons: string[];
  holidayName: string | null;
  candidates: Recommendation[];
};

const SLOT_LABELS: Record<DayPlanSlot, string> = {
  morning: "เช้า",
  afternoon: "บ่าย",
  evening: "เย็น",
};

const MAX_CANDIDATES = 24;

export async function getDayPlan(input: DayPlanInput): Promise<DayPlanSignal> {
  const hourKey = new Date().toISOString().slice(0, 13);

  return cached(`dayplan:${input.citySlug}:${hourKey}`, 60 * 45, async () => {
    const candidates = input.candidates
      .filter((item) => item.kind !== "sleep")
      .slice(0, MAX_CANDIDATES);

    if (!candidates.length) {
      return {
        available: false,
        source: "Unavailable",
        context: "",
        periods: [],
        routeUrl: null,
        updatedAt: new Date().toISOString(),
        message: "เมืองนี้ยังไม่มีลิสต์จุดเที่ยวสำหรับจัดแผน",
      };
    }

    const aiPlan = await requestAiPlan(input, candidates);
    if (aiPlan) return aiPlan;

    return buildRulePlan(input, candidates);
  });
}

type AiPlanShape = {
  context?: string;
  morning?: { ids?: number[]; reason?: string };
  afternoon?: { ids?: number[]; reason?: string };
  evening?: { ids?: number[]; reason?: string };
};

async function requestAiPlan(input: DayPlanInput, candidates: Recommendation[]): Promise<DayPlanSignal | null> {
  const prompt = buildPrompt(input, candidates);

  const raw = process.env.AI_API_KEY
    ? await requestOpenAiJson(prompt)
    : process.env.GEMINI_API_KEY
      ? await requestGeminiJson(prompt)
      : null;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AiPlanShape;
    const periods = (Object.keys(SLOT_LABELS) as DayPlanSlot[]).map((slot) => {
      const picked = (parsed[slot]?.ids ?? [])
        .map((id) => candidates[id])
        .filter((item): item is Recommendation => Boolean(item))
        .slice(0, 2);
      return {
        slot,
        label: SLOT_LABELS[slot],
        rainChance: input.weather.rainByPeriod[slot],
        reason: (parsed[slot]?.reason ?? "").slice(0, 160),
        items: picked.map((item) => ({ title: item.title, area: item.area, kind: item.kind })),
      };
    });

    // แผนต้องมีของครบทุกช่วง ไม่งั้นถือว่าโมเดลตอบไม่สมบูรณ์ ปล่อยให้ fallback ทำงาน
    if (periods.some((period) => !period.items.length)) return null;

    return {
      available: true,
      source: process.env.AI_API_KEY ? "AI day plan" : "Gemini day plan",
      context: (parsed.context ?? "").slice(0, 200),
      periods,
      routeUrl: buildRouteUrl(input, periods),
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function buildPrompt(input: DayPlanInput, candidates: Recommendation[]) {
  const facts = {
    city: input.cityName,
    condition: input.weather.condition,
    temperature: input.weather.temperature,
    rainPercentByPeriod: input.weather.rainByPeriod,
    activeWarnings: input.warnings.items.map((item) => item.label),
    seasonHighlights: input.activeSeasons,
    holiday: input.holidayName,
    candidates: candidates.map((item, id) => ({
      id,
      kind: item.kind,
      title: item.title,
      area: item.area,
      note: item.note,
    })),
  };

  return [
    "จัดแผนเที่ยวหนึ่งวันเป็นภาษาไทยจากข้อมูลจริงด้านล่าง เลือกสถานที่จาก candidates เท่านั้น (อ้างอิงด้วย id)",
    "กติกา: ช่วงไหนฝน >= 60% ให้เลือกจุดในร่มช่วงนั้น, ช่วงเย็นควรมีร้านอาหารหรือย่านกลางคืน, จุดที่ area เดียวกันควรอยู่ช่วงเดียวกันเพื่อลดการเดินทาง, ถ้ามี warning หรือ seasonHighlights ให้สะท้อนใน context",
    'ตอบเป็น JSON เท่านั้น รูปแบบ: {"context":"สรุปภาพรวมวันสั้น ๆ","morning":{"ids":[0,1],"reason":"..."},"afternoon":{"ids":[2],"reason":"..."},"evening":{"ids":[3,4],"reason":"..."}}',
    JSON.stringify(facts),
  ].join("\n");
}

async function requestOpenAiJson(prompt: string): Promise<string | null> {
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
          { role: "system", content: "You plan one-day itineraries strictly from the provided candidates. Reply with JSON only." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 420,
        temperature: 0.3,
      }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

async function requestGeminiJson(prompt: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 420,
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        }),
      },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

// ไม่มี AI key หรือโมเดลตอบเสีย — จัดแผนด้วยกติกาง่าย ๆ ให้เสมอ
function buildRulePlan(input: DayPlanInput, candidates: Recommendation[]): DayPlanSignal {
  const rain = input.weather.rainByPeriod;
  const used = new Set<Recommendation>();

  const indoorish = (item: Recommendation) =>
    /ในร่ม|ปลอดฝน|พิพิธภัณฑ์|museum|aquarium|mall|market|ตลาด|ช้อป|underground|โรงงาน|ศูนย์/i.test(
      `${item.title} ${item.note} ${item.signal}`,
    );

  const pick = (kinds: Recommendation["kind"][], preferIndoor: boolean, count: number) => {
    const pool = candidates.filter((item) => kinds.includes(item.kind) && !used.has(item));
    const sorted = preferIndoor ? [...pool.filter(indoorish), ...pool.filter((item) => !indoorish(item))] : pool;
    const chosen = sorted.slice(0, count);
    chosen.forEach((item) => used.add(item));
    return chosen.map((item) => ({ title: item.title, area: item.area, kind: item.kind }));
  };

  const wantIndoor = (value: number | null) => (value ?? 0) >= 60;

  const periods: DayPlanPeriod[] = [
    {
      slot: "morning",
      label: SLOT_LABELS.morning,
      rainChance: rain.morning,
      reason: wantIndoor(rain.morning) ? "ฝนเช้าค่อนข้างชัวร์ เริ่มจากจุดในร่มก่อน" : "เก็บจุดกลางแจ้งตอนแสงดีและคนยังน้อย",
      items: pick(["see", "do"], wantIndoor(rain.morning), 2),
    },
    {
      slot: "afternoon",
      label: SLOT_LABELS.afternoon,
      rainChance: rain.afternoon,
      reason: wantIndoor(rain.afternoon) ? "ช่วงฝนเข้า สลับเป็นโซนในร่ม/ช้อป" : "ต่อสายกิจกรรมหรือของฝากแบบไม่รีบ",
      items: pick(["do", "shop"], wantIndoor(rain.afternoon), 2),
    },
    {
      slot: "evening",
      label: SLOT_LABELS.evening,
      rainChance: rain.evening,
      reason: "ปิดวันด้วยของอร่อยใกล้ย่านเดินเล่น",
      items: pick(["eat", "see"], wantIndoor(rain.evening), 2),
    },
  ];

  const contextParts = [
    input.weather.available ? `${input.weather.condition} ${input.weather.temperature ?? "-"}°C` : null,
    input.warnings.items.length ? `มีประกาศ${input.warnings.items[0].label}` : null,
    input.activeSeasons.length ? `${input.activeSeasons[0]}กำลังพีค` : null,
    input.holidayName ? `อยู่ในช่วง${input.holidayName}` : null,
  ].filter(Boolean);

  return {
    available: true,
    source: "Rule-based plan",
    context: contextParts.join(" • "),
    periods,
    routeUrl: buildRouteUrl(input, periods),
    updatedAt: new Date().toISOString(),
  };
}

// เปิด Google Maps เรียงตามลำดับช่วงของวัน — ใช้ชื่อสถานที่ให้ Google จับตำแหน่งเอง
function buildRouteUrl(input: DayPlanInput, periods: DayPlanPeriod[]) {
  const stops = periods.flatMap((period) => period.items).map((item) => `${item.title} ${input.cityName}`);
  if (stops.length < 2) return null;

  const origin = input.stationName ? `${input.stationName} ${input.cityName}` : `${input.cityName} Station`;
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(0, -1).slice(0, 9);

  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", destination);
  if (waypoints.length) url.searchParams.set("waypoints", waypoints.join("|"));
  return url.toString();
}
