import { getCityConfigBySlug, type Recommendation as CityRecommendation } from "@/lib/cities/city-configs";
import { japanHolidayWindows, windowStatus } from "@/lib/cities/holidays";
import { citiesWithSeasons, getCitySeasonCalendar, getCitySeasons } from "@/lib/cities/seasons";
import { getCityTransit } from "@/lib/cities/transit";
import { getAreaCoord, hasAreaCoord, type LatLon } from "@/lib/cities/area-coords";
import { getRecommendationSets } from "@/lib/cities/travel-meta";
import { buildOutbound } from "@/lib/outbound";
import { getAqi } from "@/lib/services/aqi";
import { getEvents } from "@/lib/services/events";
import { resolveCity } from "@/lib/services/geocode";
import { getWarnings } from "@/lib/services/warnings";
import { getWeather } from "@/lib/services/weather";
import { getWebcams } from "@/lib/services/webcams";
import { getStays } from "@/lib/services/stays";
import { getEatPlaces, type DietFilter } from "@/lib/services/places";
import { getFlightSignal } from "@/lib/services/flight-signal";
import { cached } from "@/lib/utils/cache";
import { toBubbles, type Card, type ChatReply } from "@/lib/chat/types";

// กร๊วกตอบเป็น 1 LLM call: parseIntent (โค้ด) → รวม signal ฝั่ง server → compose.
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
  /** ฤดูทั้งปีของเมืองนี้ (ไม่ใช่แค่ที่กำลังเกิด) — ให้ตอบ "ใบไม้แดงเมื่อไหร่" ได้ทุกเดือน */
  seasonCalendar: { name: string; kind: string; window: string; note: string }[];
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

  const hasAiKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY || process.env.GEMINI_API_KEY);
  if (hasAiKey) {
    const aiReply = await composeAiReply(context, intent, prompt);
    if (aiReply) return { reply: aiReply, source: "AI advisor" };
  }

  return { reply: buildFallbackReply(context, intent, prompt), source: "Rule-based advisor" };
}

// ── ChatReply — Phase 0 (docs/chat-cards-roadmap.md) ──────────────────────
// หัวใจ: LLM มีหน้าที่เดียวคือพูดไทย (bubbles) — cards ทั้งหมดโค้ดประกอบจากข้อมูลจริง
// ที่ fetch มาแล้ว ไม่ใช่จาก LLM. citySlug = null รองรับ "หน้าแรก = แชท ไม่บังคับเลือกเมือง"
// (docs/chat-cards-roadmap.md Phase 0 U7) — ตอบระดับประเทศจาก season data ล้วน ไม่ยิง LLM.
// allowLlm = false เมื่อ route เกิน AI budget (rate limit) → parse intent + compose ด้วย
// rule-based ทั้งคู่ ไม่ยิง LLM เลย (Fable B3: เดิม comment บอก rule-based แต่โค้ดยังยิง LLM).
export async function getAdvisorChatReply(
  citySlug: string | null,
  prompt: string,
  allowLlm = true,
): Promise<ChatReply> {
  if (!citySlug) return buildCountryLevelReply();

  // ยิง 3 อย่างขนานกัน: compose (LLM/rule), context (สำหรับ cards), intent (parse คำถาม).
  // เดิม parseCardIntent ต่อคิวหลัง context ทำให้ +1s ทุกคำตอบ — intent ใช้แค่ prompt จึงขนานได้ (Fable W2).
  const [result, context, intent] = await Promise.all([
    getAdvisorReply(citySlug, prompt),
    gatherContext(citySlug),
    parseCardIntent(prompt, allowLlm),
  ]);
  const cards = context ? await buildCityCards(citySlug, context, intent) : [];

  return { bubbles: toBubbles(result.reply), cards, source: result.source };
}

// intent จากคำถาม — โครงสร้างที่ใช้เลือก/เจาะการค้นหา card (หมวด + diet + ย่าน + งบ + คำอาหาร).
// **LLM เป็นตัว parse หลัก** (อ่านเจตนาได้ครบกว่า regex เยอะ — "ทงคัตสึแถวเมืองเก่างบสองพัน"
// regex ไม่มีวันครบ). ไม่มี LLM key → fallback regex หยาบ (แค่ กิน/นอน/บิน) พอให้ dual-mode ไม่พัง.
// เจ้าของสั่ง 2026-07-16: "anysearch/LLM ฉลาดพอ อย่า hardcode". LLM เข้าใจเจตนา, API หาข้อมูลจริง.
type CardIntent = {
  wantsEat: boolean;
  wantsStay: boolean;
  wantsFlight: boolean;
  diet?: DietFilter;
  /** ชื่อย่านที่ผู้ใช้เอ่ย → ค้นเจาะย่านแทนทั้งเมือง */
  area?: string;
  /** งบต่อคืน (บาท) → กรองที่พัก */
  maxBudgetThb?: number;
  /** คำค้นอาหาร เช่น "ramen" "sushi" → ต่อท้าย query ของ Places */
  foodKeyword?: string;
};

// fallback หยาบเมื่อไม่มี LLM key — แค่จับหมวด+diet พื้นฐาน ไม่พยายามฉลาด (ให้ LLM ทำ)
function parseIntentRuleBased(prompt: string): CardIntent {
  const p = prompt.toLowerCase();
  const diet: DietFilter | undefined = /ฮาลาล|halal|muslim/i.test(prompt)
    ? "halal"
    : /มังสวิรัติ|เจ|vegetarian|vegan/i.test(prompt)
      ? "vegetarian"
      : /แพ้กุ้ง|no shrimp/i.test(prompt)
        ? "no-shrimp"
        : undefined;
  return {
    wantsEat: /กิน|อาหาร|ร้าน|eat|food|restaurant/i.test(p) || Boolean(diet),
    wantsStay: /นอน|พัก|โรงแรม|ที่พัก|hotel|stay/i.test(p),
    wantsFlight: /ตั๋ว|บิน|flight/i.test(p),
    diet,
  };
}

// LLM parse intent → structured JSON. ให้โมเดลอ่านเจตนา (ฉลาดกว่า regex) แต่คืนแค่
// "โครงคำค้น" ไม่ใช่ข้อมูล — ข้อมูลจริงมาจาก Places/Rakuten (กัน hallucinate ราคา/ชื่อร้าน).
// allowLlm=false (เกิน budget) / ไม่มี Anthropic key / พัง / parse ไม่ได้ → fallback rule-based.
// cache ผลด้วย (temperature 0 = deterministic) — prompt ซ้ำไม่ยิง LLM ซ้ำ (Fable W3).
async function parseCardIntent(prompt: string, allowLlm: boolean): Promise<CardIntent> {
  // llmParseIntent ทำเฉพาะ Anthropic → เช็คตรงตัว (Fable W4: เดิมเช็ค 3 provider แต่ทำแค่ตัวเดียว)
  if (!allowLlm || !process.env.ANTHROPIC_API_KEY) return parseIntentRuleBased(prompt);

  try {
    // cache เฉพาะผลสำเร็จ — ถ้า LLM พัง (null) โยนเพื่อไม่ให้ cache null (ไม่งั้น prompt นั้นไม่ลอง LLM ซ้ำ 24 ชม)
    const llm = await cached(`intent:${prompt.toLowerCase()}`, 60 * 60 * 24, async () => {
      const r = await llmParseIntent(prompt);
      if (!r) throw new Error("intent parse failed");
      return r;
    });
    return llm;
  } catch {
    return parseIntentRuleBased(prompt);
  }
}

const INTENT_SYSTEM = [
  "Extract travel search intent from a Thai/English question. Return ONLY minified JSON, no prose.",
  'Shape: {"wantsEat":bool,"wantsStay":bool,"wantsFlight":bool,"diet":"halal"|"vegetarian"|"no-shrimp"|null,"area":string|null,"maxBudgetThb":number|null,"foodKeyword":string|null}',
  "area = neighbourhood/district name in ENGLISH romaji if the user named one (e.g. Shinjuku, Dotonbori), else null.",
  "foodKeyword = specific dish in ENGLISH if named (ramen, sushi, tonkatsu, yakiniku, cafe...), else null.",
  "maxBudgetThb = per-night budget in Thai baht if the user gave a number or said cheap (map 'ถูก'/'cheap' to 1500), else null.",
  "Set wantsEat/wantsStay/wantsFlight true only for what the user actually asks about.",
].join(" ");

async function llmParseIntent(prompt: string): Promise<CardIntent | null> {
  try {
    let raw: string | null = null;
    if (process.env.ANTHROPIC_API_KEY) {
      // timeout 3s — intent call block Promise.all ของ card ทั้งหมด, แขวนไม่ได้ (Fable W1: latency ฆ่า warmth)
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 200,
          temperature: 0,
          system: INTENT_SYSTEM,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));
      if (res.ok) {
        const data = (await res.json()) as { content?: { type?: string; text?: string }[] };
        raw = data.content?.find((b) => b.type === "text")?.text ?? null;
      }
    }
    if (!raw) return null;

    const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json) as Partial<CardIntent>;
    const validDiet = parsed.diet && ["halal", "vegetarian", "no-shrimp"].includes(parsed.diet) ? parsed.diet : undefined;
    return {
      wantsEat: Boolean(parsed.wantsEat),
      wantsStay: Boolean(parsed.wantsStay),
      wantsFlight: Boolean(parsed.wantsFlight),
      diet: validDiet,
      area: typeof parsed.area === "string" && parsed.area ? parsed.area : undefined,
      maxBudgetThb: typeof parsed.maxBudgetThb === "number" && parsed.maxBudgetThb > 0 ? parsed.maxBudgetThb : undefined,
      foodKeyword: typeof parsed.foodKeyword === "string" && parsed.foodKeyword ? parsed.foodKeyword : undefined,
    };
  } catch {
    return null;
  }
}

// แปลงชื่อย่าน (จาก LLM) → พิกัด center. ย่านที่ไม่มีใน area-coords → fallback city center
// แต่ warn ไว้ (Fable + standing invariant: silent absorbing default = อันตราย). LLM คืนย่าน
// romaji อิสระ (เช่น "Gion", "Akihabara") ที่ตารางอาจยังไม่มี — warn ทำให้รู้ว่าตารางต้องโต.
function resolveAreaCenter(area: string, cityCenter: LatLon): LatLon {
  if (!hasAreaCoord(area)) {
    console.warn(`[advisor] area "${area}" ไม่มีใน area-coords → ใช้ city center (ตารางควรเพิ่มย่านนี้)`);
  }
  return getAreaCoord(area, cityCenter);
}

// การ์ดระดับเมือง — โค้ดประกอบจากของจริงเท่านั้น. Phase 1: ต่อ stays (Rakuten) /
// places (Google) / flight (fli) เพิ่มจาก weather+webcam+place เดิม. ทุกแหล่ง dual-mode +
// ยิงขนาน (Promise.all) — ไม่มี key/พัง → signal.available=false → ไม่มี card ใบนั้น ไม่ล้มคำตอบ.
// เรียง card ตาม intent จากคำถาม (ถามกิน→ร้านขึ้นก่อน, ถามนอน→ที่พัก, ถามบิน→ตั๋ว).
async function buildCityCards(citySlug: string, context: AdvisorContext, intent: CardIntent): Promise<Card[]> {
  const city = await resolveCity(citySlug);
  if (!city) return [];

  const config = getCityConfigBySlug(city.slug);

  // ย่าน (จาก LLM intent) → เลื่อน center การค้นไปย่านนั้น (Fable B2). ไม่มี/ไม่รู้จัก → city center.
  // ⚠ standing invariant: ย่านที่ LLM คืนแต่ไม่มีใน area-coords จะ fallback เงียบไป center —
  // warn ให้รู้ว่าตารางต้องโต (ไม่ปล่อยเงียบ).
  const [searchLat, searchLon] = intent.area
    ? resolveAreaCenter(intent.area, [city.lat, city.lon])
    : [city.lat, city.lon];

  // ยิงของนอกทั้งหมดขนานกัน — เปราะ/ช้าตัวไหนก็ไม่ block ตัวอื่น (ทุกตัว fail-silent ในตัวเอง)
  const [webcam, stays, eats, flight] = await Promise.all([
    getWebcams(city.lat, city.lon, config),
    intent.wantsStay ? getStays(searchLat, searchLon) : Promise.resolve(null),
    intent.wantsEat
      ? getEatPlaces(searchLat, searchLon, city.name, { diet: intent.diet, foodKeyword: intent.foodKeyword })
      : Promise.resolve(null),
    intent.wantsFlight ? getFlightSignal(city.name, city.prefecture) : Promise.resolve(null),
  ]);

  const weatherCard: Card[] = [];
  const flightCards: Card[] = [];
  const stayCards: Card[] = [];
  const eatCards: Card[] = [];
  const webcamCards: Card[] = [];
  const placeCards: Card[] = [];

  if (context.weather.available) {
    const hasRange = typeof context.weather.high === "number" && typeof context.weather.low === "number";
    weatherCard.push({
      id: `weather-${city.slug}`,
      kind: "weather",
      cityName: context.cityName,
      headline: `${context.cityName} ตอนนี้ ${context.weather.condition}${typeof context.weather.temperature === "number" ? ` ${context.weather.temperature}°C` : ""}`,
      tempRange: hasRange ? `${context.weather.low}–${context.weather.high}°C` : undefined,
      rainChance: context.weather.rainChance,
      season: context.activeSeasons[0],
    });
  }

  // ── ตั๋วบิน (Phase 1) — ถามเรื่องบินเท่านั้น. flight signal คืน available เสมอ (มี deep-link)
  if (flight?.available) {
    flightCards.push({
      id: `flight-${city.slug}`,
      kind: "flight",
      route: flight.route,
      priceThb: flight.priceThb,
      airline: flight.airline ?? undefined,
      period: flight.period ?? undefined,
      searchUrl: buildOutbound(flight.searchUrl, { kind: "flight", label: flight.route, citySlug: city.slug }),
      note: flight.priceThb == null ? "กร๊วกยังเช็คราคาสดไม่ได้ กดดูที่ Google Flights ได้เลย" : undefined,
    });
  }

  // ── ที่พัก (Phase 1, Rakuten) — กรองงบก่อน (Fable B2) แล้วเอา 2 ใบถูกสุด.
  // งบ null ในรายการ = ไม่รู้ราคา → เก็บไว้ (ดีกว่าตัดทิ้ง card ที่อาจเข้าเกณฑ์)
  if (stays?.available) {
    const withinBudget = intent.maxBudgetThb
      ? stays.items.filter((s) => s.pricePerNightThb == null || s.pricePerNightThb <= intent.maxBudgetThb!)
      : stays.items;
    for (const s of withinBudget.slice(0, 2)) {
      stayCards.push({
        id: `stay-${city.slug}-${s.name}`,
        kind: "stay",
        title: s.name,
        area: s.area,
        pricePerNightThb: s.pricePerNightThb,
        rating: s.rating,
        imageUrl: s.imageUrl,
        bookUrl: buildOutbound(s.bookingUrl, { kind: "stay", label: s.name, citySlug: city.slug }),
      });
    }
  }

  // ── ร้านอาหาร (Phase 1, Google Places) — สูงสุด 2 ใบเรตติ้งสูง
  if (eats?.available) {
    for (const e of eats.items.slice(0, 2)) {
      eatCards.push({
        id: `eat-${city.slug}-${e.name}`,
        kind: "eat",
        title: e.name,
        area: e.area,
        cuisine: e.cuisine,
        rating: e.rating,
        priceLevel: e.priceLevel,
        imageUrl: e.imageUrl,
        mapUrl: buildOutbound(e.mapUrl, { kind: "eat", label: e.name, citySlug: city.slug }),
      });
    }
  }

  // ── กล้องสด — ต้องมีทั้งภาพ preview และลิงก์ดูจริง ไม่งั้นไม่สร้างการ์ด (กันลิงก์ปลอม)
  if (webcam.available && webcam.previewImage && webcam.url) {
    webcamCards.push({
      id: `webcam-${city.slug}`,
      kind: "webcam",
      title: webcam.title ?? `กล้องสด ${context.cityName}`,
      previewImage: webcam.previewImage,
      liveUrl: buildOutbound(webcam.url, { kind: "webcam", label: webcam.title ?? undefined, citySlug: city.slug }),
      source: webcam.source,
    });
  }

  // ── สถานที่คัดมือ (fallback เมื่อ Places ไม่มี key/ไม่ตรง) 1 ใบต่อหมวด — ไม่ generic
  const sets = getRecommendationSets(city.name, city.prefecture, config?.recommendations ?? []);
  // ถ้ามีร้านจริงจาก Places / ที่พักจริงจาก Rakuten แล้ว ไม่ต้องดัน place หมวดนั้นซ้ำ
  const placePicks: { kind: "see" | "eat" | "sleep"; emoji: string }[] = [{ kind: "see", emoji: "⛩" }];
  // ⚠ ถ้าผู้ใช้ระบุ diet (ฮาลาล/มังฯ/แพ้กุ้ง) แต่ Places ไม่เจอร้าน → ห้ามโผล่ place eat
  // fallback (ร้าน hardcode ไม่การันตี diet — แนะผิดเงื่อนไขความเชื่อ/แพ้อาหาร = อันตราย)
  if (!eatCards.length && !intent.diet) placePicks.push({ kind: "eat", emoji: "🍜" });
  if (!stayCards.length) placePicks.push({ kind: "sleep", emoji: "🛏" });
  for (const pick of placePicks) {
    const item = sets[pick.kind].find((r) => !r.generic);
    if (!item) continue;
    placeCards.push({
      id: `place-${pick.kind}-${city.slug}-${item.title}`,
      kind: "place",
      title: item.title,
      area: item.area,
      emoji: pick.emoji,
      note: item.note,
      mapUrl: buildOutbound(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.title} ${city.name}`)}`, {
        kind: "nav",
        label: item.title,
        citySlug: city.slug,
      }),
    });
  }

  // เรียงตาม intent: หมวดที่ถามขึ้นก่อน แล้วตามด้วยบริบท (weather/webcam) + place ปิดท้าย
  const intentFirst: Card[] = intent.wantsFlight
    ? flightCards
    : intent.wantsStay
      ? stayCards
      : intent.wantsEat
        ? eatCards
        : [];
  const rest = [flightCards, stayCards, eatCards].filter((g) => g !== intentFirst).flat();

  return [...intentFirst, ...weatherCard, ...rest, ...webcamCards, ...placeCards];
}

// ถามแบบยังไม่มีเมือง ("เดือนนี้ไปไหนดี", "หิมะตกที่ไหน") — ตอบจาก season data ของทุกเมือง
// ล้วน ๆ ไม่ยิง LLM (ข้อมูลพอตอบตรง ๆ อยู่แล้ว, กันค่าใช้จ่าย+latency ของคำถามกว้างที่สุด).
async function buildCountryLevelReply(): Promise<ChatReply> {
  const matches: { slug: string; name: string; season: { name: string; note: string } }[] = [];

  for (const slug of citiesWithSeasons()) {
    const config = getCityConfigBySlug(slug);
    if (!config) continue;
    const active = getCitySeasons(slug).find((season) => windowStatus(season.from, season.to).state === "active");
    if (active) matches.push({ slug, name: config.name, season: { name: active.name, note: active.note } });
  }

  const picks = matches.slice(0, 4);
  const cards: Card[] = picks.map((m) => ({
    id: `season-${m.slug}`,
    kind: "weather",
    cityName: m.name,
    headline: `${m.name} กำลังเป็นช่วง${m.season.name}`,
    season: m.season.name,
    note: m.season.note,
  }));

  const monthName = new Intl.DateTimeFormat("th-TH", { month: "long" }).format(new Date());
  const bubbles = picks.length
    ? [
        `ช่วง${monthName}นี้ กร๊วกเห็นหลายที่กำลังสวยพอดีเลยครับ 🐾`,
        picks.map((m) => `• ${m.name}: ${m.season.name} — ${m.season.note}`).join("\n"),
        "อยากรู้รายละเอียดเมืองไหน ถามชื่อเมืองมาได้เลยครับ หรือบอกงบ/จำนวนวันก็ได้",
      ]
    : [
        `ช่วง${monthName}นี้ กร๊วกยังไม่มีไฮไลต์ฤดูที่คัดไว้พอดีช่วงนี้ครับ`,
        "ลองบอกชื่อเมืองที่สนใจ หรือถามเรื่องอากาศ/งบประมาณได้เลย กร๊วกช่วยดูให้",
      ];

  return { bubbles, cards, source: "Rule-based advisor" };
}

// คำทักทายเปิดหน้าของกร๊วก — คำนวณฝั่ง server ครั้งเดียว ส่งเป็น prop ให้ hero
// (seed เป็นข้อความแรกของแชท → คนเข้ามายังไม่พิมพ์ก็เห็น "คำตอบ" ทันที).
// zero-LLM ในโหมด local; ถ้ามี AI key ค่อยยิง compose หนึ่งครั้งตอน build/revalidate.
// PERF: gatherContext ยิง weather/aqi/events/warnings ซ้ำกับ page.tsx แต่ทุกตัว
// ห่อ cached() (TTL 10-30 นาที) → เป็น cache hit ในหน้าเดียวกัน ไม่ใช่ network ซ้ำ.
// อาศัย revalidate=600 ของเพจ ทำให้ทั้งหน้า render ไม่เกิน 1 ครั้ง/10 นาที/เมือง.
export async function getCityVerdict(citySlug: string): Promise<string> {
  const context = await gatherContext(citySlug);
  if (!context) return `สวัสดีครับ ยังไม่รู้จักเมืองนี้ ลองเลือกเมืองจากหน้าแรกอีกครั้งนะครับ`;

  const intent: AdvisorIntent = { period: "now", wantsFlights: false };
  const opener = `ช่วงนี้เที่ยว ${context.cityName} ดีไหม กร๊วกช่วยดูให้`;

  const hasAiKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY || process.env.GEMINI_API_KEY);
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
      : "อยากได้แผนแบบไหนบอกกร๊วกได้เลยครับ 👇";

  // คั่นแต่ละก้อนความคิดด้วย \n\n เพื่อให้ฝั่ง client แตกเป็นหลาย speech bubble ได้
  // (แต่ละบรรทัดใน lead ก็เป็น bubble แยก — ประกาศเตือน/วันหยุดควรเด่นทีละใบ)
  return [`สวัสดีครับ 👋`, ...lead, [weatherLine, seasonLine].filter(Boolean).join(" "), closer]
    .filter(Boolean)
    .join("\n\n");
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

  // ⚠ กันของปลอม: รายการ generic เป็นชื่อที่ระบบแต่งเอง (เช่น "Otaru cafe street")
  // ไม่มีอยู่จริง — เดิมถูกส่งเข้า LLM เหมือนของจริง ทำให้กร๊วกแนะนำร้านที่ไม่มีอยู่
  // ได้ทั้งที่ system prompt สั่งห้ามแต่งข้อมูล (ความจริงรั่วที่ชั้น context ไม่ใช่ที่โมเดล).
  // ตอนนี้กรองทิ้งก่อนถึงกร๊วก → เมืองไม่มีของจริงก็ตอบน้อยลง ดีกว่าตอบผิด.
  const compact = (items: CityRecommendation[]) =>
    items
      .filter((item) => !item.generic)
      .slice(0, 6)
      .map((item) => ({ title: item.title, note: item.note.slice(0, 120) }));

  return {
    cityName: city.name,
    prefecture: city.prefecture,
    weather,
    aqi,
    events,
    warnings,
    activeSeasons,
    seasonCalendar: getCitySeasonCalendar(city.slug).map((season) => ({
      name: season.name,
      kind: season.kind,
      window: season.window,
      note: season.note.slice(0, 120),
    })),
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
const SYSTEM_PROMPT = [
  "You are กร๊วก, a warm but concise Thai travel advisor for Japan.",
  "Use ONLY the provided context. Never invent current facts, timings, prices, operating hours, or place names.",
  "Give ONE clear recommendation the traveller can act on, in Thai within 120 words.",
  "If a weather warning is active, lead with it.",
  // ข้อมูลใหม่ที่เพิ่งต่อเข้ามา — บอกโมเดลว่ามีอะไรใช้ได้บ้าง ไม่งั้นมันไม่รู้ว่ามี
  "dailyOutlook = per-day forecast up to 16 days ahead (date/high/low/rainChance). Use it for questions about tomorrow or the coming days. Do NOT answer beyond the last date it contains.",
  "seasonCalendar = this city's seasonal highlights for the WHOLE year with their date windows. Use it to answer when-to-visit questions (e.g. autumn leaves, cherry blossoms) even if that season is not active now. These windows are multi-year averages, not a forecast — say so when it matters.",
  // ปิดช่องที่เคยรั่ว: ถ้าไม่มีข้อมูล ให้บอกว่าไม่รู้ ห้ามเดา
  "If the context has no recommendation for what is asked, say plainly that you don't have one for this city yet and suggest asking about something you do have. Never fill the gap with a plausible-sounding place name.",
].join(" ");

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
      // ฤดูทั้งปี — ตอบ "ใบไม้แดงเมื่อไหร่ / ไปเดือนไหนดี" ได้แม้ตอนนี้ยังไม่ถึงฤดูนั้น
      seasonCalendar: context.seasonCalendar,
      // พยากรณ์ล่วงหน้าถึง 16 วัน — ตอบ "พรุ่งนี้/สุดสัปดาห์นี้ฝนไหม" ได้
      dailyOutlook: context.weather.outlook.slice(0, 16),
      holiday: context.holidayName,
      events: context.events.items.slice(0, 3).map((item) => item.title),
      recommendations: context.recommendations,
    },
  });

  // ลำดับ provider: Claude (กร๊วก Thai voice ดีสุด) → OpenAI → Gemini → rule fallback.
  // แต่ละตัวมี key ของตัวเอง ไม่มี key = ข้าม, ตอบเสีย (null) = ไล่ตัวถัดไป
  if (process.env.ANTHROPIC_API_KEY) {
    const reply = await requestClaudeReply(userContent);
    if (reply) return reply;
  }
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

async function requestClaudeReply(userContent: string): Promise<string | null> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.3,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { content?: { type?: string; text?: string }[] };
    const text = data.content?.find((block) => block.type === "text")?.text;
    return text?.trim() ?? null;
  } catch {
    return null;
  }
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
  // context กรอง generic ออกแล้ว → เมืองที่ไม่มีของคัดมือจะได้ลิสต์ว่าง
  // ต้องบอกตรง ๆ ว่ายังไม่มี ห้ามเงียบแล้วปล่อยหัวข้อลอย (เดิมของปลอมถมช่องนี้ให้)
  const section = (label: string, items: Recommendation[], empty: string) =>
    items.length ? [label, ...bullet(items)] : [empty];

  // ถามอะไรต้องได้เรื่องนั้น — หัวข้อที่ถาม (กิน/นอน) มาก่อนสภาพอากาศเสมอ.
  // เดิมฝน >= 60% จะปล้น branch ไปตอบ "ที่เที่ยวในร่ม" ทั้งที่ผู้ใช้ถามเรื่องกิน
  // (เมืองฝนตกถามหาร้าน แล้วได้คลองมาแทน) → ฝนเป็นหมายเหตุต่อท้าย ไม่ใช่ตัวเปลี่ยนหัวข้อ
  const askedEat = lower.includes("กิน") || lower.includes("eat") || lower.includes("อาหาร") || lower.includes("ร้าน");
  const askedSleep = lower.includes("นอน") || lower.includes("พัก") || lower.includes("hotel") || lower.includes("sleep");
  const rainNote = rainHigh ? "(ฝนช่วงนี้มีสิทธิ์มา พกร่มไปด้วยนะครับ)" : "";

  let body: string[];
  if (askedEat) {
    body = [
      ...section("ถ้าจะโฟกัสเรื่องกิน เริ่มจากนี่ก่อน:", eat, `ร้านใน ${context.cityName} กร๊วกยังไม่มีที่คัดไว้ให้ครับ ลองถามเรื่องที่เที่ยวหรือย่านพักแทนได้`),
      rainNote,
    ];
  } else if (askedSleep) {
    body = [
      ...section("ถ้าจะเลือกย่านพัก ดูตัวเลือกนี้ก่อน:", sleep, `ย่านพักใน ${context.cityName} กร๊วกยังไม่มีที่คัดไว้ให้ครับ`),
      rainNote,
    ];
  } else if (rainHigh || lower.includes("ฝน") || lower.includes("rain")) {
    const picks = see.filter(indoorish);
    body = section("ฝนช่วงนี้มีสิทธิ์มา เริ่มจากจุดที่เปลี่ยนแผนง่าย/อยู่ในร่มก่อน:", picks.length ? picks : see, `จุดใน ${context.cityName} กร๊วกยังไม่มีที่คัดไว้ให้ครับ`);
  } else {
    body = section("จุดที่เข้ากับจังหวะวันนี้:", see, `${context.cityName} กร๊วกยังไม่มีจุดที่คัดไว้ให้ครับ — ถามเรื่องอากาศหรือช่วงเวลาที่ควรไปได้นะ`);
  }

  return [...lead, weatherLine, ...body].filter(Boolean).join("\n");
}
