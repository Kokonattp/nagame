// Turn one Thai message into structured intent.
// Code extracts numbers (days, month, places); System One judges meaning.
// Thresholds come from M0 (spec §9): noul ≥ 0.7; preferences judged on the
// message alone, never with route context (context made Jev over-tag).

import { findFocus } from "./cities";
import { STAY_WORDS } from "./eat-buy";
import { FAQ_KEYWORDS, FAQ_TOPICS, type FaqTopic } from "./faq";
import { askSystemOne, systemOneConfigured } from "./system-one";
import { PREFERENCES, type Preference, type TabiContext, type TripIntent } from "./types";

export type Intent =
  | "start_trip" | "refine" | "pick_option" | "ask_detail" | "add_stop"
  | "draft_itinerary" | "ask_flight" | "practical_question" | "ask_weather" | "find_food_shop" | "find_sights"
  | "booking" | "smalltalk" | "other";

export type Understanding = {
  intent: Intent;
  confidence: number;
  needsFresh: boolean;
  pickPosition: number | null;
  /** practical question topic (visa, SIM, money…) when one fits */
  faqTopic: FaqTopic | null;
  preferences: Preference[];
  month?: number;
  durationDays?: number;
  startDate?: string;
  focus: string[];
  source: "jev" | "fallback";
};

const NOUL_THRESHOLD = 0.7;

// ── numbers & names: code, not the model ──
// Abbreviations require their dots: optional dots made consonant pairs inside ordinary
// words match (review: "พาเด็กคนเล็ก" → ก.ค., "อยากชมคาวากุจิ" → ม.ค.).
const MONTHS: [RegExp, number][] = [
  [/ม\.ค\.|มกรา|\bjan(uary)?\b|ปีใหม่/i, 1], [/ก\.พ\.|กุมภา|\bfeb(ruary)?\b/i, 2],
  [/มี\.ค\.|มีนา|\bmar(ch)?\b/i, 3], [/เม\.ย\.|เมษา|\bapr(il)?\b|สงกรานต์/i, 4],
  [/พ\.ค\.|พฤษภา|\bmay\b/i, 5], [/มิ\.ย\.|มิถุนา|\bjune?\b/i, 6],
  [/ก\.ค\.|กรกฎา|\bjuly?\b/i, 7], [/ส\.ค\.|สิงหา|\baug(ust)?\b/i, 8],
  [/ก\.ย\.|กันยา|\bsep(tember)?\b/i, 9], [/ต\.ค\.|ตุลา|\boct(ober)?\b/i, 10],
  [/พ\.ย\.|พฤศจิกา|\bnov(ember)?\b/i, 11], [/ธ\.ค\.|ธันวา|\bdec(ember)?\b/i, 12],
];

/** First month mentioned wins ("ม.ค." never matches inside "มี.ค." because of the vowel). */
export function parseMonth(text: string): number | undefined {
  let best: { month: number; index: number } | undefined;
  for (const [re, month] of MONTHS) {
    const m = re.exec(text);
    if (m && (!best || m.index < best.index)) best = { month, index: m.index };
  }
  return best?.month;
}

/**
 * "10 ธ.ค." / "วันที่ 3 มกรา" / "Dec 10" → "YYYY-MM-DD", the next such date from `today`.
 * Only a day number glued to a month counts, so "5 วัน พ.ค." is not a date.
 */
export function parseStartDate(text: string, today = new Date()): string | undefined {
  const m = /(?:วันที่\s*)?(\d{1,2})\s*(?=(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.|มกรา|กุมภา|มีนา|เมษา|พฤษภา|มิถุนา|กรกฎา|สิงหา|กันยา|ตุลา|พฤศจิกา|ธันวา|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))/i.exec(text);
  if (!m) return undefined;
  const day = Number(m[1]);
  const month = parseMonth(text.slice(m.index));
  if (!month || day < 1 || day > 31) return undefined;
  let year = today.getFullYear();
  const candidate = new Date(Date.UTC(year, month - 1, day));
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  if (candidate.getTime() < todayUtc) year += 1;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1) return undefined; // e.g. 31 ก.พ.
  return d.toISOString().slice(0, 10);
}

export function parseDays(text: string): number | undefined {
  const m = /(\d{1,2})\s*(วัน|days?)/i.exec(text);
  if (m) return Math.min(Number(m[1]), 21);
  const weeks = /(\d)\s*(สัปดาห์|อาทิตย์|weeks?)/i.exec(text);
  if (weeks) return Math.min(Number(weeks[1]) * 7, 21);
  if (/อาทิตย์นึง|หนึ่งอาทิตย์|สัปดาห์|week/i.test(text)) return 7;
  return undefined;
}

// ── judgement: System One ──
const INTENTS: Record<Intent, string> = {
  start_trip: "Starts planning a new Japan trip or describes what kind of trip they want",
  refine: "Wants to change or adjust the options or route already shown (e.g. fewer crowds, easier, different day)",
  pick_option: "Selects one of the options currently shown, e.g. 'the first one'",
  ask_detail: "Asks a question about a specific place or route already mentioned",
  add_stop: "Wants to add a stop or activity to the current route",
  draft_itinerary: "Wants the route turned into a day-by-day plan",
  ask_flight: "Asks about flights, tickets, airfare, or airlines",
  practical_question: "Asks a practical how-to question about travelling in Japan (visa, money, SIM or internet, IC cards, luggage, manners, emergencies, clothes to pack, plugs, airport transfer, rail pass) rather than planning the route",
  ask_weather: "Asks about the weather: will it snow or rain, how cold or hot it is, temperature, or the weather forecast for the trip or a place",
  find_food_shop: "Asks for restaurants, food to eat, cafes, bars, shopping, markets or souvenirs in a place, or asks where to stay (hotel, ryokan, hostel, which area to stay in)",
  find_sights: "Asks what to see or which sights, attractions, temples or things to do there are in a place, without asking for a trip plan",
  booking: "Asks Tabi itself to make a booking, reservation or payment (hotel, ticket, tour), not just for recommendations",
  smalltalk: "Greeting, thanks, or chit-chat with no planning request",
  other: "Anything else that is not about planning or travelling in Japan",
};

const PREF_TEXT: Record<Preference, string> = {
  nature: "nature, mountains, scenery outdoors",
  snow: "wants to see snow",
  onsen: "hot springs / onsen",
  food: "food is a main goal",
  shopping: "shopping",
  culture: "temples, shrines, history, culture",
  fewer_crowds: "wants fewer crowds / quieter places",
  easy_travel: "wants easy or short travel, first-timer friendly, little detour",
  family: "travelling with children or family",
  scenic_photo: "wants photogenic views, seasonal colors, photos",
};

export async function understand(message: string, ctx: TabiContext): Promise<Understanding> {
  const startDate = parseStartDate(message);
  const base = {
    month: startDate ? Number(startDate.slice(5, 7)) : parseMonth(message),
    durationDays: parseDays(message),
    startDate,
    focus: findFocus(message),
  };
  if (!systemOneConfigured()) return { ...base, ...keywordFallback(message, ctx), source: "fallback" };

  const context = {
    stage: ctx.selectedRoute ? "a route is selected" : ctx.shownRoutes?.length ? "Tabi just showed route options" : "no trip yet",
    shown_options: (ctx.shownRoutes ?? []).map((r, i) => ({ position: i + 1, title: r.title })),
    selected_route: ctx.selectedRoute?.title ?? null,
  };

  try {
    const [meaning, prefs] = await Promise.all([
      askSystemOne({ message, context }, {
        intent: {
          type: "choice",
          instructions: "What does the traveller want from the Japan trip planner with `message`? Use `context` to resolve references.",
          criteria: INTENTS,
        },
        needs_fresh_data: {
          type: "noul",
          instructions: "Does answering `message` correctly require live or current information such as current prices, schedules, opening months, or closures?",
        },
        pick_position: {
          type: "choice",
          instructions: "If `message` selects one of `context.shown_options`, which position? Otherwise none.",
          criteria: { "1": "First option", "2": "Second option", "3": "Third option", none: "No option is being selected" },
        },
        faq_topic: {
          type: "choice",
          instructions: "If `message` asks a practical travel question, which topic is it about? Otherwise none.",
          criteria: { ...FAQ_TOPICS, none: "Not a practical travel question" },
        },
      }),
      askSystemOne({ message }, Object.fromEntries(
        PREFERENCES.map((p) => [p, { type: "noul" as const, instructions: `Does \`message\` itself express this travel preference: ${PREF_TEXT[p]}?` }]),
      )),
    ]);

    const pick = meaning.pick_position.choice;
    const topic = meaning.faq_topic.choice;
    return {
      ...base,
      intent: meaning.intent.choice as Intent,
      confidence: meaning.intent.confidence,
      needsFresh: meaning.needs_fresh_data.noul >= NOUL_THRESHOLD,
      pickPosition: pick === "none" ? null : Number(pick),
      faqTopic: topic !== "none" && meaning.faq_topic.confidence >= 0.6 ? (topic as FaqTopic) : null,
      preferences: PREFERENCES.filter((p) => prefs[p].noul >= NOUL_THRESHOLD),
      source: "jev",
    };
  } catch {
    return { ...base, ...keywordFallback(message, ctx), source: "fallback" };
  }
}

// Used only when System One is unreachable: honest, narrow keyword rules.
function keywordFallback(message: string, ctx: TabiContext) {
  const t = message.toLowerCase();
  const has = (re: RegExp) => re.test(t);
  const preferences = (
    [
      ["nature", /ธรรมชาติ|ภูเขา|ทะเลสาบ|nature/], ["snow", /หิมะ|snow/], ["onsen", /ออนเซ็น|onsen|บ่อน้ำร้อน/],
      ["food", /กิน|อาหาร|ซูชิ|ราเมง|food/], ["shopping", /ช้อป|shopping/], ["culture", /วัด|ศาลเจ้า|ปราสาท|วัฒนธรรม/],
      ["fewer_crowds", /คนน้อย|เงียบ/], ["easy_travel", /ง่าย|ครั้งแรก|ไม่อ้อม|ไม่ไกล/], ["family", /ลูก|เด็ก|ครอบครัว/],
      ["scenic_photo", /ถ่ายรูป|วิว|ใบไม้|ซากุระ/],
    ] as [Preference, RegExp][]
  ).filter(([, re]) => has(re)).map(([p]) => p);

  // "ครั้งแรก" (first time) is not a pick — only option words count.
  const pickMatch = /(อันแรก|เส้นแรก|ตัวแรก|(?:อัน|เส้น)ที่ ?1)|((?:อัน|เส้น)ที่ ?(?:สอง|2))|((?:อัน|เส้น)ที่ ?(?:สาม|3))/.exec(t);
  const pickPosition = pickMatch ? (pickMatch[1] ? 1 : pickMatch[2] ? 2 : 3) : null;
  const hasOptions = Boolean(ctx.shownRoutes?.length || ctx.selectedRoute);

  const faqTopic = FAQ_KEYWORDS.find(([, re]) => re.test(message))?.[0] ?? null;

  let intent: Intent = "start_trip";
  // "ไปฟุกุโอกะ 4 วัน กินราเมน": a trip length makes it a trip to plan, whatever else is mentioned
  const tripLength = has(/\d+\s*(?:วัน|คืน|days?|nights?)/);
  if (tripLength && !hasOptions && !has(/ตั๋ว|ไฟลท์|เครื่องบิน|flight|หิมะจะตก|ฝนจะตก|อากาศ|กี่องศา/)) intent = "start_trip";
  else if (has(/หิมะจะตก|ฝนจะตก|อากาศ.*(ไหม|ยังไง|เป็นไง)|หนาวไหม|ร้อนไหม|กี่องศา|พยากรณ์|weather|forecast/)) intent = "ask_weather";
  else if (has(STAY_WORDS) && !has(/จอง|จ่ายเงิน/)) intent = "find_food_shop";
  else if (has(/ที่เที่ยว|เที่ยวไหนดี|เที่ยวที่ไหนดี|มีอะไรน่าเที่ยว|มีอะไรเที่ยว|สถานที่ท่องเที่ยว|things to do|attractions/)) intent = "find_sights";
  else if (has(/ร้าน|กินอะไร|ของกิน|ราเม|ซูชิ|คาเฟ่|ช้อปปิ้ง|ช็อป|ชอป|ของฝาก|ซื้อของ|ตลาด|ห้าง|restaurant|souvenir/)) intent = "find_food_shop";
  else if (faqTopic) intent = "practical_question";
  else if (has(/ตั๋ว|ไฟลท์|เครื่องบิน|flight/)) intent = "ask_flight";
  else if (has(/สวัสดี|ขอบคุณ|\bhello\b|\bhi\b/)) intent = "smalltalk";
  else if (has(/จอง|จ่ายเงิน/)) intent = "booking";
  else if (pickPosition && hasOptions) intent = "pick_option";
  else if (has(/รายวัน|แผน.*วัน|ตาราง/)) intent = "draft_itinerary";
  else if (has(/แวะ|เพิ่ม/) && hasOptions) intent = "add_stop";
  else if (hasOptions && preferences.length) intent = "refine";
  // A trip is in progress: an unmatched follow-up ("ขอ 7 วัน") adjusts it instead of wiping it.
  else if ((hasOptions || ctx.intent) && !has(/ทริปใหม่|เริ่มใหม่/)) intent = "refine";

  return { intent, confidence: 0.5, needsFresh: intent === "ask_flight", pickPosition, faqTopic, preferences };
}

export function mergeIntent(prev: TripIntent | undefined, u: Understanding): TripIntent {
  const startOver = u.intent === "start_trip";
  const prevPrefs = startOver ? [] : prev?.preferences ?? [];
  return {
    month: u.month ?? (startOver ? undefined : prev?.month),
    durationDays: u.durationDays ?? (startOver ? undefined : prev?.durationDays),
    // a new month without a day invalidates an old exact date
    startDate: u.startDate ?? (startOver || (u.month && prev?.startDate && Number(prev.startDate.slice(5, 7)) !== u.month) ? undefined : prev?.startDate),
    preferences: [...new Set([...prevPrefs, ...u.preferences])],
    focus: u.focus.length ? u.focus : startOver ? [] : prev?.focus ?? [],
  };
}
