// One Tabi turn: understand → decide → act → reply.
// Thai wording comes from the phrase bank below; data comes from the planner.

import { buildOutbound } from "@/lib/outbound";
import { CITY_BY_NAME, GATEWAYS, nearestGateway, REGION_TH, type Region } from "./cities";
import { closedIn, draftItinerary, findPlaceByText, fitRouteToDays, partlyOpenIn, PREF_TH, seasonOf, suggestRoutes, suggestStops } from "./planner";
import type { FlightLink, Place, Preference, TabiContext, TabiReply, TripIntent } from "./types";
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
    note: "เปิดใน Google Flights ดูได้ว่าราคาตอนนี้สูงหรือต่ำกว่าปกติ พร้อมกราฟราคา · ทาบิยังไม่ได้เช็กราคาเอง",
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
  const lines = [`${p.nameEn}${p.nameJa ? ` (${p.nameJa})` : ""} อยู่แถว ${CITY_BY_NAME.get(p.baseCity)?.th ?? p.baseCity} — ${crowd} ${p.season === "all_year" ? "ไปได้ทั้งปี" : `ช่วงที่ดีคือ${SEASON_TH[p.season]}`}`];
  const partly = closed ? null : partlyOpenIn(p, month);
  if (closed) lines.push(`⚠️ ${closed.note} ช่วงที่ถามอาจเข้าไม่ได้ เช็กเว็บทางการก่อนนะ`);
  else if (partly) lines.push(`⚠️ ${partly.note} เดือนที่ถามเปิดแค่บางช่วง ดูวันให้ตรงก่อนจองนะ`);
  else lines.push("รายละเอียดเวลาเปิด-ปิดควรเช็กเว็บทางการก่อนไปนะ");
  return lines;
}

export async function respond(message: string, ctx: TabiContext): Promise<TabiReply> {
  const u = await understand(message, ctx);
  const intent = mergeIntent(ctx.intent, u);
  const source = u.source;
  const base = { intent, source } as const;

  // Low confidence on anything that changes the plan → ask, don't guess (spec §2.7).
  if (u.source === "jev" && u.confidence < 0.5 && !["smalltalk", "other"].includes(u.intent)) {
    return { ...base, action: "ask", bubbles: ["ทาบิไม่แน่ใจว่าหมายถึงอะไร ช่วยเลือกให้หน่อยนะ"], ask: { question: "อยากให้ทาบิทำอะไรต่อ", chips: ["เสนอเส้นทางใหม่", "จัดแผนรายวัน", "ดูตั๋วเครื่องบิน"] } };
  }

  switch (u.intent) {
    case "smalltalk":
      return { ...base, action: "chat", bubbles: [pick(["สวัสดี! ทาบิเองนะ 🐾 อยากไปญี่ปุ่นแบบไหน เล่ามาได้เลย", "ยินดีเลย! มีอะไรให้ทาบิช่วยวางทริปบอกได้นะ"], message)], chips: START_CHIPS };

    case "other":
      return { ...base, action: "chat", bubbles: ["เรื่องจองหรือจ่ายเงิน ทาบิยังทำให้ไม่ได้นะ แต่ช่วยวางเส้นทางกับร่างทริปได้ แล้วค่อยกดไปจองที่เว็บต้นทาง"], chips: ctx.selectedRoute ? ["จัดแผนรายวัน", "ดูตั๋วเครื่องบิน"] : START_CHIPS };

    case "ask_flight": {
      const arrive = ctx.selectedRoute?.gateway.city ?? focusGateway(intent);
      const last = ctx.selectedRoute?.stops[ctx.selectedRoute.stops.length - 1];
      const flight = flightLink(intent, arrive, last ? nearestGateway(last).g.city : arrive);
      return { ...base, action: "flights", flight, bubbles: [pick(["ตั๋วราคาสดทาบิยังเช็กเองไม่ได้ แต่เปิดหน้าค้นหาที่ตรงกับทริปไว้ให้แล้ว กดดูได้เลย ✈️", "ราคาตั๋วเปลี่ยนทุกวัน ทาบิพาไปหน้าค้นหาที่ตั้งเส้นทางไว้ให้แล้วนะ"], message)] };
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
