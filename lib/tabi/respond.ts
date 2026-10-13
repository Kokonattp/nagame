// One Tabi turn: understand → decide → act → reply.
// Thai wording comes from the phrase bank below; data comes from the planner.

import { buildOutbound } from "@/lib/outbound";
import { CITY_BY_NAME, GATEWAYS, nearestGateway, REGION_TH, type Region } from "./cities";
import { closedIn, draftItinerary, findPlaceByText, fitRouteToDays, partlyOpenIn, PREF_TH, seasonOf, suggestRoutes, suggestStops } from "./planner";
import { faqAnswer } from "./faq";
import { eatQuery, findEatBuy, findStay, livePlaceCards, STAY_WORDS, tabelog } from "./eat-buy";
import { liveConfigured, liveEat, liveFlight } from "./live-search";
import { fetchSafety } from "./safety";
import { findSights } from "./sights";
import { chatReply } from "./chat-llm";
import { REGION_CITY, weatherAnswer, weatherCities } from "./weather";
import { cheapestDates } from "./flight-calendar";
import { FLIGHTS_CHECKED_AT, flightSnapFor } from "./flight-snapshot";
import type { FlightLink, Place, PlaceCard, Preference, TabiContext, TabiReply, TripIntent } from "./types";
import { mergeIntent, understand } from "./understand";

const MONTH_TH = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const MONTH_EN = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SEASON_TH = { spring: "ใบไม้ผลิ", summer: "หน้าร้อน", autumn: "ใบไม้เปลี่ยนสี", winter: "หน้าหนาว", all_year: "ทั้งปี" };

const REFINE_CHIPS = ["คนน้อยกว่านี้", "เดินทางง่ายกว่านี้", "ขอมีออนเซ็น", "เน้นวิวถ่ายรูป"];
const START_CHIPS = ["ดูใบไม้ผลิ", "อยากเห็นหิมะ", "แช่ออนเซ็น", "พาเด็กเที่ยว"];

function pick<T>(variants: T[], seed: string): T {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return variants[Math.abs(h) % variants.length];
}

function tripLabel(intent: TripIntent) {
  const parts: string[] = [];
  if (intent.durationDays) parts.push(`${intent.durationDays} วัน`);
  if (intent.month) parts.push(`ช่วง ${MONTH_TH[intent.month]}`);
  if (intent.preferences.length) parts.push(`เน้น${intent.preferences.slice(0, 2).map((p) => PREF_TH[p as Preference]).join("+")}`);
  const focus = intent.focus.map((f) => (f.startsWith("region:") ? REGION_TH[f.slice(7) as Region] : CITY_BY_NAME.get(f)?.th ?? f));
  if (focus.length) parts.push(`แถว${focus.join(", ")}`);
  return parts.join(" ");
}

const googleFlights = (q: string) => `https://www.google.com/travel/flights?hl=th&curr=THB&q=${encodeURIComponent(q)}`;

/** "11 ต.ค." from an ISO timestamp (Bangkok date). */
function thaiDay(iso: string) {
  const d = new Date(new Date(iso).getTime() + 7 * 3_600_000);
  return `${d.getUTCDate()} ${MONTH_TH[d.getUTCMonth() + 1]}`;
}

/** The 10th of that month this year, or next year when it has passed (like the snapshot's sample trips). */
function sampleDepart(month: number) {
  const now = new Date();
  let year = now.getFullYear();
  if (month < now.getMonth() + 1 || (month === now.getMonth() + 1 && now.getDate() > 3)) year++;
  return `${year}-${String(month).padStart(2, "0")}-10`;
}

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Google Flights search links for the trip. With an exact start date the search
 * carries both dates (Google then shows its "prices are high/low" insight for them);
 * with only a month it searches that month. Flying home from a different airport
 * (open-jaw) gets its own one-way search for the return leg.
 */
export function flightLink(intent: TripIntent, arriveCity = "Tokyo", departCity = arriveCity): FlightLink {
  const arrive = GATEWAYS.find((g) => g.city === arriveCity) ?? GATEWAYS[0];
  const depart = GATEWAYS.find((g) => g.city === departCity) ?? arrive;
  const openJaw = depart.city !== arrive.city;
  const outDate = intent.startDate;
  const retDate = outDate && intent.durationDays ? addDays(outDate, Math.max(intent.durationDays - 1, 0)) : undefined;

  let when = "";
  if (outDate) when = retDate && !openJaw ? ` on ${outDate} through ${retDate}` : ` on ${outDate}${openJaw ? " one way" : ""}`;
  else if (intent.month) {
    const now = new Date();
    const year = intent.month >= now.getMonth() + 1 ? now.getFullYear() : now.getFullYear() + 1;
    when = ` in ${MONTH_EN[intent.month]} ${year}`;
  }
  const th = (c: string) => CITY_BY_NAME.get(c)?.th ?? c;
  return {
    label: `ดูตั๋ว กรุงเทพ → ${th(arrive.city)}`,
    url: buildOutbound(googleFlights(`Flights to ${arrive.searchName} from Bangkok${when}`), { kind: "flight", label: `BKK→${arrive.airport}` }),
    note: "ราคาจริงของวันที่เลือกดูใน Google Flights ได้ว่าตอนนี้สูงหรือต่ำกว่าปกติ พร้อมกราฟราคา",
    legs: [
      { dir: "outbound", from: "กรุงเทพ", fromCode: "BKK", to: th(arrive.city), toCode: arrive.airport, date: outDate },
      { dir: "return", from: th(depart.city), fromCode: depart.airport, to: "กรุงเทพ", toCode: "BKK", date: retDate },
    ],
    returnUrl: openJaw
      ? buildOutbound(googleFlights(`Flights to Bangkok from ${depart.searchName}${retDate ? ` on ${retDate} one way` : when}`), { kind: "flight", label: `${depart.airport}→BKK` })
      : undefined,
  };
}

function describePlace(p: Place, month?: number): string[] {
  const closed = closedIn(p, month);
  const crowd = p.crowd >= 4.2 ? "คนเยอะมาก ควรไปเช้า" : p.crowd >= 3.2 ? "คนพอสมควร" : "คนไม่ค่อยเยอะ";
  const lines = [`${p.nameTh ? `${p.nameTh} (${p.nameEn})` : `${p.nameEn}${p.nameJa ? ` (${p.nameJa})` : ""}`} อยู่แถว ${CITY_BY_NAME.get(p.baseCity)?.th ?? p.baseCity} — ${crowd} ${p.season === "all_year" ? "ไปได้ทั้งปี" : `ช่วงที่ดีคือ${SEASON_TH[p.season]}`}`];
  const partly = closed ? null : partlyOpenIn(p, month);
  if (closed) lines.push(`⚠️ ${closed.note} ช่วงที่ถามอาจเข้าไม่ได้ เช็กเว็บทางการก่อนนะ`);
  else if (partly) lines.push(`⚠️ ${partly.note} เดือนที่ถามเปิดแค่บางช่วง ดูวันให้ตรงก่อนจองนะ`);
  else lines.push("รายละเอียดเวลาเปิด-ปิดควรเช็กเว็บทางการก่อนไปนะ");
  return lines;
}

/**
 * Live fare for the trip's dates (live-search worker), or null so the snapshot answer is used:
 * worker not configured, busy, over its daily cap, blocked, or no price on the page.
 */
async function liveFlightBubbles(arrive: string, depart: string, back: string, sample: boolean): Promise<string[] | null> {
  if (!liveConfigured()) return null;
  const g = GATEWAYS.find((x) => x.city === arrive) ?? GATEWAYS[0];
  const res = await liveFlight(g.searchName, depart, back);
  if ("error" in res || !res.cheapest) return null;
  const th = CITY_BY_NAME.get(g.city)?.th ?? g.city;
  return [
    `ทาบิเพิ่งเช็กใน Google Flights: ไป-กลับ${th} ${sample ? "(ตัวอย่าง) " : ""}ไป ${thaiDay(depart)} กลับ ${thaiDay(back)} เริ่ม ~฿${res.cheapest.toLocaleString("en-US")}${res.nonstop ? ` · บินตรง ~฿${res.nonstop.price.toLocaleString("en-US")} (${res.nonstop.airline})` : " · วันนั้นไม่เจอบินตรง"} ✈️`,
    sample ? "บอกวันไปที่แน่นอนได้ ทาบิจะเช็กราคาของวันนั้นให้" : "ราคาขยับได้ทุกชั่วโมง กดดูเที่ยวบินทั้งหมดก่อนจองนะ",
  ];
}

/** Live restaurant list for a food question, or null so the guide / snapshot answer is used. */
async function liveEatAnswer(message: string, places: string[]): Promise<{ bubbles: string[]; links: { label: string; url: string }[]; places: PlaceCard[] } | null> {
  if (!liveConfigured()) return null;
  const q = eatQuery(message, places);
  if (!q) return null;
  const res = await liveEat(q.area, q.what);
  if ("error" in res || !res.places.length) return null;
  const search = { label: `ค้น ${q.what} แถว ${q.area} ใน Google Maps (มีรีวิว)`, url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${q.what} ${q.area} Japan`)}` };
  return {
    bubbles: [`${q.whatTh}แถว${/^[A-Za-z]/.test(q.placeTh) ? " " : ""}${q.placeTh} ที่คะแนนดีใน Google Maps ตอนนี้ ${Math.min(res.places.length, 6)} ที่ กดดูรีวิวกับเวลาเปิดได้เลย`, "ร้านอาจปิดหรือย้ายได้ เช็กเวลาเปิดก่อนไปนะ · ทาบิเพิ่งเช็กใน Google Maps"],
    places: livePlaceCards(res.places),
    links: [search, { label: `ดูคะแนนร้าน${q.whatTh === "ร้านอาหาร" ? "" : q.whatTh}แถว ${q.area} ใน Tabelog`, url: tabelog(q.what === "restaurant" ? q.area : `${q.area} ${q.what}`) }],
  };
}

/** One line per live JMA warning/event for these cities, or "nothing now" — never a guess. */
async function safetyNow(cities: string[]): Promise<string[]> {
  if (!cities.length) return [];
  const { alerts, events } = await fetchSafety(cities);
  const where = cities.map((c) => CITY_BY_NAME.get(c)?.th ?? c).join(", ");
  const lines = [
    ...events.map((e) => (e.kind === "quake" ? `⚠️ แผ่นดินไหวแรงระดับ ${e.shindo} ${e.prefsTh} ใน 24 ชม. ระวังอาฟเตอร์ช็อก`
      : e.kind === "tsunami" ? `⚠️ ${e.level} (${e.areaJa}) ถ้าอยู่ใกล้ทะเลให้ขึ้นที่สูงทันที`
      : `⚠️ ภูเขาไฟ ${e.volcano} ใกล้${e.cityTh}: ${e.level} ห้ามเข้าเขตปากปล่อง`)),
    ...alerts.map((a) => `⚠️ ${a.cityTh}: ${a.hazard} (${a.level >= 50 ? "特別警報" : a.level >= 40 ? "危険警報" : "警報"})`),
  ];
  return lines.length ? [`ประกาศจากกรมอุตุฯ ญี่ปุ่นตอนนี้ แถว${where}`, ...lines] : [`ตอนนี้แถว${where}ไม่มีประกาศเตือนภัยระดับที่ต้องระวังจากกรมอุตุฯ ญี่ปุ่น`];
}

export async function respond(message: string, ctx: TabiContext): Promise<TabiReply> {
  const u = await understand(message, ctx);
  // "เที่ยวเกียวโต 5 วัน ไปไหนดี" names a trip length: that is a trip to plan, not a list of sights
  // (a place and a length are a clear enough request: no "not sure what you mean" question, even when
  // Jev is split between planning a trip and listing sights)
  if ((u.intent === "find_sights" || u.intent === "start_trip") && u.durationDays && u.focus.length)
    Object.assign(u, { intent: "start_trip", confidence: Math.max(u.confidence, 0.5) });
  const intent = mergeIntent(ctx.intent, u);
  const source = u.source;
  const base = { intent, source } as const;

  // the trip being talked about: the chosen route, else the first route shown (ids are city names joined by "-")
  const tripStops = ctx.selectedRoute?.stops.map((s) => s.city)
    ?? (ctx.shownRoutes?.[0]?.id.split("-").map((part) => [...CITY_BY_NAME.values()].find((c) => c.name.toLowerCase() === part)?.name).filter((c): c is string => Boolean(c)) ?? []);
  const chipsAfter = ctx.selectedRoute ? ["จัดแผนรายวัน", "ดูตั๋วเครื่องบิน"] : START_CHIPS;

  // "หิมะจะตกไหม" / "หนาวไหม": monthly normals (+ live forecast when the trip is close)
  if (u.intent === "ask_weather" || (u.faqTopic === "weather" && /หิมะ|ฝน|องศา|หนาว|ร้อน|อากาศ/.test(message) && (u.focus.length || tripStops.length))) {
    const w = await weatherAnswer({ cities: weatherCities(u.focus.length ? u.focus : intent.focus, tripStops), month: intent.month, startDate: intent.startDate, days: intent.durationDays });
    return { ...base, action: w.needMonth ? "ask" : "answer", bubbles: w.bubbles, links: w.links, ...(w.needMonth ? { ask: { question: "ไปเดือนไหน", chips: ["ธ.ค.", "ม.ค.", "ก.พ.", "เม.ย."] } } : { chips: chipsAfter }) };
  }

  // "ร้านราเมนแถวชินจูกุ" / "ของฝากที่โอซาก้า" / "เรียวกังที่ฮาโกเนะ": guide listings + Google Maps / Hotels links.
  // "จองโรงแรมให้หน่อย" is still refused (Tabi books nothing), but gets the same stay suggestions.
  const stayAsked = STAY_WORDS.test(message);
  // a region ("ฮอกไกโด") stands for its main city in a where-to question
  const asked = (u.focus.length ? u.focus : intent.focus.length ? intent.focus : tripStops).map((f) => (f.startsWith("region:") ? REGION_CITY[f.slice(7) as Region] ?? f : f));
  if (u.intent === "find_food_shop" || (u.intent === "booking" && stayAsked)) {
    const places = asked;
    // restaurants: checked live in Google Maps when the worker is up, else the guide / snapshot list
    const found = stayAsked ? findStay(message, places) : (await liveEatAnswer(message, places)) ?? findEatBuy(message, places);
    const refuse = u.intent === "booking" ? ["ทาบิจองหรือจ่ายเงินให้ไม่ได้นะ แต่ช่วยหาที่พักให้เลือกได้"] : [];
    return { ...base, action: "answer", bubbles: [...refuse, ...found.bubbles.filter((b) => !refuse.length || !b.includes("จองให้ไม่ได้"))], links: found.links, places: found.places, chips: chipsAfter };
  }

  // "ที่เที่ยวเกียวโตมีอะไรบ้าง" / "วัดในนารา": the best-known sights there (a region keeps its whole area)
  if (u.intent === "find_sights") {
    const found = findSights(message, u.focus.length ? u.focus : intent.focus.length ? intent.focus : tripStops);
    const th = found.city ? CITY_BY_NAME.get(found.city)?.th : undefined;
    return { ...base, action: "answer", bubbles: found.bubbles, links: found.links, chips: th ? [`เที่ยว${th} 3 วัน`, `ร้านอาหารแถว${th}`, `ที่พักแถว${th}`] : chipsAfter };
  }

  // A practical question ("ต้องขอวีซ่าไหม") gets a checked answer, whatever stage the trip is at.
  if (u.faqTopic && (u.intent === "practical_question" || u.intent === "ask_detail" || u.intent === "other" || u.confidence < 0.5)) {
    const a = faqAnswer(u.faqTopic, { route: ctx.selectedRoute, intent });
    // safety: what JMA says right now for the places being talked about comes first
    const live = u.faqTopic === "emergency" ? await safetyNow(asked.filter((c) => CITY_BY_NAME.has(c))) : [];
    return { ...base, action: "answer", bubbles: [...live, ...a.bubbles], links: a.links, chips: ctx.selectedRoute ? ["จัดแผนรายวัน", "ดูตั๋วเครื่องบิน"] : START_CHIPS };
  }
  if (u.intent === "practical_question") {
    return { ...base, action: "answer", bubbles: ["เรื่องนี้ทาบิยังไม่มีคำตอบที่แน่ใจ ตอนนี้ตอบได้เรื่องวีซ่า ซิม เงิน บัตร IC กระเป๋า มารยาท เหตุฉุกเฉิน อากาศ ปลั๊กไฟ และการเดินทางจากสนามบิน"], chips: ["ต้องขอวีซ่าไหม", "ซื้อซิมยังไงดี", "ต้องพกเงินสดไหม"] };
  }

  // Low confidence on anything that changes the plan → ask, don't guess (spec §2.7).
  if (u.source === "jev" && u.confidence < 0.5 && !["smalltalk", "other", "booking"].includes(u.intent)) {
    return { ...base, action: "ask", bubbles: ["ทาบิไม่แน่ใจว่าหมายถึงอะไร ช่วยเลือกให้หน่อยนะ"], ask: { question: "อยากให้ทาบิทำอะไรต่อ", chips: ["เสนอเส้นทางใหม่", "จัดแผนรายวัน", "ดูตั๋วเครื่องบิน"] } };
  }

  switch (u.intent) {
    case "smalltalk":
      return { ...base, action: "chat", bubbles: [(await chatReply(message)) ?? smalltalkReply(message)], chips: START_CHIPS };

    case "booking":
      return { ...base, action: "chat", bubbles: ["เรื่องจองหรือจ่ายเงิน ทาบิยังทำให้ไม่ได้นะ แต่ช่วยวางเส้นทางกับร่างทริปได้ แล้วค่อยกดไปจองที่เว็บต้นทาง"], chips: chipsAfter };

    case "other": {
      const chips = ctx.selectedRoute ? ["ทริปนี้หิมะตกไหม", "จัดแผนรายวัน", "ดูตั๋วเครื่องบิน"] : START_CHIPS;
      // a chat model may talk, but never about anything that needs live facts (news, scores, today's prices)
      const said = u.needsFresh ? null : await chatReply(message);
      if (said) return { ...base, action: "chat", bubbles: [said], chips };
      return {
        ...base, action: "chat",
        bubbles: [pick(["เรื่องนี้ทาบิยังตอบไม่ได้นะ 🐾", "อันนี้ทาบิยังไม่รู้จริง ๆ ขอไม่เดานะ"], message), "ถามทาบิได้เรื่องวางทริปญี่ปุ่น อากาศ หิมะ ที่เที่ยว ร้านอาหาร ของฝาก ที่พัก ตั๋วเครื่องบิน และเรื่องเตรียมตัวอย่างวีซ่าหรือซิม"],
        chips,
      };
    }

    case "ask_flight": {
      const arrive = ctx.selectedRoute?.gateway.city ?? focusGateway(intent);
      const last = ctx.selectedRoute?.stops[ctx.selectedRoute.stops.length - 1];
      const flight = flightLink(intent, arrive, last ? nearestGateway(last).g.city : arrive);
      // a price Tabi checked itself (owner's collector), stated with its sample dates and check date
      const gw = GATEWAYS.find((g) => g.city === arrive)?.airport;
      const found = gw ? flightSnapFor(gw, intent.startDate ? Number(intent.startDate.slice(5, 7)) : intent.month) : null;
      // "ไป ม.ค. 5 วัน" without a date: offer the cheapest departures of that month first
      const askedMonth = intent.month;
      const cal = gw && askedMonth && !intent.startDate ? cheapestDates(gw, askedMonth, intent.durationDays ?? 5) : null;
      if (cal && askedMonth) {
        const best = cal.options[0];
        return {
          ...base, action: "flights", flight, dateOptions: cal.options, dateOptionsDays: cal.days,
          bubbles: [
            `ช่วง ${MONTH_TH[askedMonth]} ไป ${cal.days} วัน ตั๋วถูกสุดที่ทาบิเช็กไว้ (${thaiDay(cal.checkedAt)}): ไป ${thaiDay(best.depart)} กลับ ${thaiDay(best.back)} ไป-กลับ ~฿${best.price.toLocaleString("en-US")} ✈️`,
            "เลือกช่วงวันที่ชอบด้านล่าง แล้วทาบิตั้งวันเดินทางให้เลย",
          ],
        };
      }
      // a fare checked just now: the trip's own dates, else a sample week in the month asked about
      const sampleStart = intent.month ? sampleDepart(intent.month) : undefined;
      const liveDepart = intent.startDate ?? sampleStart;
      const live = liveDepart ? await liveFlightBubbles(arrive, liveDepart, addDays(liveDepart, Math.max((intent.durationDays ?? 5) - 1, 0)), !intent.startDate) : null;
      if (live) return { ...base, action: "flights", flight, bubbles: live };
      const bubbles = found
        ? [
            `ทาบิเช็กไว้เมื่อ ${thaiDay(FLIGHTS_CHECKED_AT)}: ไป-กลับ${CITY_BY_NAME.get(arrive)?.th ?? arrive} ${found.exact ? "" : `(ตัวอย่างช่วง ${MONTH_TH[Number(found.snap.month.slice(5, 7))]}) `}เริ่ม ~฿${found.snap.cheapest!.toLocaleString("en-US")}${found.snap.nonstop ? ` · บินตรง ~฿${found.snap.nonstop.price.toLocaleString("en-US")}` : ""} ✈️`,
            "ราคาเปลี่ยนทุกวัน กดดูราคาจริงตามวันของพี่ใน Google Flights ได้เลย",
          ]
        : [pick(["ทาบิเปิดหน้าค้นหาที่ตรงกับทริปไว้ให้แล้ว กดดูราคาจริงได้เลย ✈️", "ราคาตั๋วเปลี่ยนทุกวัน ทาบิพาไปหน้าค้นหาที่ตั้งเส้นทางไว้ให้แล้วนะ"], message)];
      return { ...base, action: "flights", flight, bubbles };
    }

    case "pick_option": {
      const chosen = u.pickPosition ? ctx.shownRoutes?.[u.pickPosition - 1] : undefined;
      if (!chosen) break;
      return { ...base, action: "open_route", openRouteId: chosen.id, bubbles: [`ได้เลย! ไปดูเส้น ${chosen.title} กัน`] };
    }

    case "add_stop": {
      if (!ctx.selectedRoute) break;
      const wanted = u.preferences.filter((p) => !["fewer_crowds", "easy_travel", "family"].includes(p));
      const stops = suggestStops(ctx.selectedRoute, intent, wanted);
      if (!stops.length) {
        const what = wanted.length ? wanted.map((p) => PREF_TH[p]).join(" / ") : "จุดที่ตรงใจ";
        return { ...base, action: "chat", bubbles: [`แถว ${ctx.selectedRoute.stops.map((s) => s.cityTh).join(" – ")} ทาบิยังไม่มีข้อมูล${what}ที่ดีพอจะแนะนำ ลองเปลี่ยนเส้นทางที่มี${what}ไหม?`], chips: [wanted.length ? `เสนอเส้นทางที่มี${what}` : "เสนอเส้นทางใหม่", "จัดแผนรายวัน"] };
      }
      return { ...base, action: "suggest_stops", stops, bubbles: [`แถวเส้นนี้มี ${stops.length} จุดที่น่าแวะ เลือกใส่ทริปได้เลย`] };
    }

    case "draft_itinerary": {
      if (!ctx.selectedRoute) break;
      const routeDays = ctx.selectedRoute.stops.reduce((a, s) => a + s.nights, 0) + 1;
      const { route, droppedStops } = fitRouteToDays(ctx.selectedRoute, intent.durationDays ?? routeDays);
      const itinerary = draftItinerary(route, intent, ctx.savedStops ?? []);
      const bubbles = [`นี่คือร่างทริปคร่าว ๆ ${itinerary.length} วันนะ เวลาเดินทางเป็นค่าประมาณ ปรับได้ตลอด`];
      if (droppedStops.length) bubbles.push(`${itinerary.length} วันไม่พอสำหรับ ${droppedStops.join(", ")} ทาบิเลยตัดออกก่อน ถ้าอยากไปครบ บอกเพิ่มวันได้นะ`);
      return { ...base, action: "draft_itinerary", itinerary, selectedRoute: route, bubbles };
    }

    case "ask_detail": {
      const place = findPlaceByText(message);
      if (place) return { ...base, action: "answer", bubbles: describePlace(place, intent.month) };
      return { ...base, action: "answer", bubbles: ["เรื่องนี้ทาบิยังไม่มีข้อมูลละเอียด แนะนำเช็กเว็บทางการของสถานที่นั้นนะ"], chips: REFINE_CHIPS };
    }
  }

  // start_trip / refine (and fall-throughs that lacked context)
  if (!intent.month && !intent.preferences.length && !intent.focus.length) {
    return { ...base, action: "ask", bubbles: ["อยากไปญี่ปุ่นช่วงไหน แล้วชอบเที่ยวแนวไหนบ้าง?"], ask: { question: "เลือกแนวที่ชอบ", chips: START_CHIPS } };
  }
  const isRefine = u.intent === "refine";
  // Refining keeps the trip where it was (smoke test: "คนน้อยกว่านี้" jumped Nara → Hokkaido).
  // Only an explicit new place in the message moves it.
  const planIntent = isRefine && !u.focus.length && !intent.focus.length
    ? { ...intent, focus: regionsOfShown(ctx) }
    : intent;
  const routes = await suggestRoutes(message, planIntent, isRefine ? (ctx.shownRoutes ?? []).map((r) => r.id) : []);
  if (!routes.length) {
    return { ...base, action: "chat", bubbles: ["ทาบิยังหาเส้นทางที่ตรงเงื่อนไขนี้ไม่เจอ ลองเปลี่ยนช่วงเวลาหรือแนวเที่ยวดูนะ"], chips: START_CHIPS };
  }
  const season = seasonOf(intent.month);
  const lead = isRefine
    ? pick(["ปรับให้แล้ว ลองดูชุดนี้นะ", "ได้เลย นี่คือทางเลือกที่ปรับตามที่บอก"], message)
    : `${tripLabel(intent) || "ทริปนี้"} ทาบิเห็น ${routes.length} แนวที่เข้าท่า${season && season !== "all_year" ? ` (ช่วง${SEASON_TH[season]})` : ""}`;
  const fallbackNote = source === "fallback" ? ["ตอนนี้ทาบิตอบแบบจำกัด อาจเข้าใจไม่ครบทุกคำนะ"] : [];
  return { ...base, action: "suggest_routes", routes, bubbles: [lead, ...fallbackNote], chips: REFINE_CHIPS };
}

/** A greeting gets a greeting, thanks gets thanks, a tired sigh gets sympathy — never a canned hello. */
function smalltalkReply(message: string) {
  if (/ขอบคุณ|ขอบใจ|thank|thx/i.test(message)) return pick(["ยินดีเลย! 🐾 อยากปรับทริปตรงไหนอีกบอกได้นะ", "ด้วยความยินดี มีอะไรให้ทาบิช่วยอีกบอกได้เลย"], message);
  if (/เหนื่อย|เครียด|เบื่อ|ท้อ|เศร้า|ง่วง/.test(message)) return pick(["พักก่อนนะ 🐾 ถ้าอยากหาทริปพักใจ เช่น ออนเซ็นเงียบ ๆ หรือเมืองคนน้อย บอกทาบิได้เลย", "เหนื่อยก็พักบ้างนะ ทาบิช่วยวางทริปญี่ปุ่นสบาย ๆ ไว้รอได้ เล่ามาได้เลยว่าอยากไปแบบไหน"], message);
  if (/สวัสดี|หวัดดี|ดีจ้า|hello|\bhi\b/i.test(message)) return pick(["สวัสดี! ทาบิเองนะ 🐾 อยากไปญี่ปุ่นแบบไหน เล่ามาได้เลย", "หวัดดี! วันนี้อยากวางทริปไปไหนดี"], message);
  return pick(["ทาบิฟังอยู่นะ 🐾 ถ้าอยากวางทริปญี่ปุ่น เล่ามาได้เลยว่าอยากไปช่วงไหน แนวไหน", "คุยกันได้เลย แต่ทาบิเก่งเรื่องทริปญี่ปุ่นที่สุดนะ อยากไปแบบไหนบอกมาได้"], message);
}

/** Regions of the routes the traveller is reacting to (route ids are city names joined by "-"). */
function regionsOfShown(ctx: TabiContext): string[] {
  const ids = ctx.selectedRoute ? [ctx.selectedRoute.id] : (ctx.shownRoutes ?? []).slice(0, 1).map((r) => r.id);
  const regions = new Set<string>();
  for (const id of ids) {
    for (const part of id.split("-")) {
      const city = [...CITY_BY_NAME.values()].find((c) => c.name.toLowerCase() === part);
      if (city) regions.add(`region:${city.region}`);
    }
  }
  return [...regions];
}

function focusGateway(intent: TripIntent) {
  const f = intent.focus[0];
  if (!f) return "Tokyo";
  if (f.startsWith("region:")) {
    const r = f.slice(7);
    return r === "kansai" || r === "chugoku" || r === "shikoku" ? "Osaka" : r === "kyushu" ? "Fukuoka" : r === "hokkaido" ? "Sapporo" : r === "okinawa" ? "Naha" : r === "chubu" ? "Nagoya" : "Tokyo";
  }
  const city = CITY_BY_NAME.get(f);
  if (!city) return "Tokyo";
  return GATEWAYS.map((g) => ({ g, d: Math.hypot(city.lat - CITY_BY_NAME.get(g.city)!.lat, city.lon - CITY_BY_NAME.get(g.city)!.lon) })).sort((a, b) => a.d - b.d)[0].g.city;
}
