// Route planner: code builds candidate routes from the place store,
// System One re-ranks them against what this traveller actually said.
// Nothing here invents a place — every name comes from data/places/places.json.

import placesData from "@/data/places/places.json";
import closuresData from "@/data/places/seasonal-closures.json";
import { BASE_CITIES, CITY_BY_NAME, km, nearestGateway, type BaseCity, type Region } from "./cities";
import { durationTh, travelTime } from "./rail-times";
import { askSystemOne, systemOneConfigured } from "./system-one";
import type {
  DaySlot, Highlight, ItineraryDay, ItineraryItem, Place, Preference, RouteOption, RouteStop, Season, TripIntent,
} from "./types";

const PLACES = placesData as Place[];
const CLOSURES = closuresData.closures.map((c) => ({ ...c, re: new RegExp(c.match, "i") }));

export const PREF_TH: Record<Preference, string> = {
  nature: "ธรรมชาติ", snow: "หิมะ", onsen: "ออนเซ็น", food: "สายกิน", shopping: "ช้อปปิ้ง",
  culture: "วัด-ปราสาท", fewer_crowds: "คนน้อย", easy_travel: "เดินทางง่าย", family: "พาเด็กได้",
  scenic_photo: "วิวถ่ายรูป",
};

const TYPE_FOR_PREF: Partial<Record<Preference, string[]>> = {
  nature: ["nature"], onsen: ["onsen"], culture: ["shrine_temple", "castle"],
};

export function seasonOf(month?: number): Season | undefined {
  if (!month) return undefined;
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

export function closedIn(place: Pick<Place, "nameEn">, month?: number) {
  if (!month) return null;
  return CLOSURES.find((c) => c.re.test(place.nameEn) && c.closedMonths.includes(month)) ?? null;
}

/** Open only part of `month` (e.g. Tateyama opens 15 Apr): keep in plans, but warn. */
export function partlyOpenIn(place: Pick<Place, "nameEn">, month?: number) {
  if (!month) return null;
  return CLOSURES.find((c) => c.re.test(place.nameEn) && (c.partialMonths ?? []).includes(month)) ?? null;
}

function placeFit(p: Place, intent: TripIntent): number {
  const prefs = intent.preferences;
  // Popularity keeps cards recognisable: at 1.1 a "nature" request still surfaced
  // obscure peaks (Mount Tanjō, Mount Nagi) over places Thai travellers know.
  let s = Math.log10(Math.max(p.sitelinks, 1)) * 1.6;
  if (p.sitelinks >= 30) s += 0.8; // internationally known (Himeji Castle, Fushimi Inari …)
  // Park designations cover whole areas, not a place you can walk to.
  if (/national park|quasi-national/i.test(p.nameEn)) s -= 1.5;
  for (const pref of prefs) {
    if (p.tags.includes(pref)) s += 1.2;
    if (TYPE_FOR_PREF[pref]?.includes(p.type)) s += 0.6;
  }
  const season = seasonOf(intent.month);
  if (season) s += p.season === season ? 0.8 : p.season === "all_year" ? 0.2 : -0.3;
  // Opposite-season peaks are a safety issue, not just taste: a summer climbing
  // mountain (Mount Tsurugi) was suggested for a December snow trip.
  if (season === "winter" && p.season === "summer" && p.type === "nature") s -= 2.5;
  if (season === "summer" && p.season === "winter") s -= 1.5;
  if (prefs.includes("fewer_crowds")) s -= (p.crowd - 2) * 0.6;
  if (prefs.includes("family")) s += p.family ? 0.5 : -0.8;
  if (prefs.includes("easy_travel")) s += p.firstTimer ? 0.4 : -0.2;
  return s;
}

function usablePlaces(intent: TripIntent) {
  return PLACES.filter(
    (p) => p.baseKm <= 70 && !closedIn(p, intent.month) && !/national park|quasi-national/i.test(p.nameEn),
  );
}

function inFocus(city: BaseCity, focus: string[]) {
  if (!focus.length) return true;
  return focus.some((f) => (f.startsWith("region:") ? city.region === (f.slice(7) as Region) : f === city.name));
}

function topPlacesFor(city: string, intent: TripIntent, exclude = new Set<string>(), n = 3): Place[] {
  return usablePlaces(intent)
    .filter((p) => p.baseCity === city && !exclude.has(p.id))
    .map((p) => ({ p, s: placeFit(p, intent) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.p);
}

function cityScore(city: string, intent: TripIntent) {
  return topPlacesFor(city, intent, new Set(), 4).reduce((a, p) => a + placeFit(p, intent), 0);
}

function toHighlight(p: Place, intent: TripIntent): Highlight {
  const matched = intent.preferences.filter((x) => p.tags.includes(x)).map((x) => PREF_TH[x]);
  return {
    id: p.id, name: p.nameEn, nameJa: p.nameJa, city: p.baseCity, lat: p.lat, lon: p.lon, type: p.type,
    crowd: p.crowd, wikiTitle: p.wikiTitle,
    approxDetourMin: Math.round((p.baseKm / 40) * 60 / 5) * 5 || undefined,
    reason: matched.length ? `เข้ากับ${matched.slice(0, 2).join(" + ")}` : p.crowd <= 2.5 ? "คนไม่เยอะ" : undefined,
  };
}

function nightsSplit(days: number, stops: number) {
  const nights = Math.max(days - 1, 1);
  const base = Math.floor(nights / stops);
  return Array.from({ length: stops }, (_, i) => base + (i < nights % stops ? 1 : 0));
}

function stopCount(days: number) {
  return days <= 3 ? 1 : days <= 6 ? 2 : 3;
}

// ── route candidates ──
type Candidate = { stops: BaseCity[]; score: number; totalKm: number };

function buildCandidates(intent: TripIntent): Candidate[] {
  const days = intent.durationDays ?? 5;
  const want = stopCount(days);
  const scored = BASE_CITIES.filter((c) => inFocus(c, intent.focus))
    .map((c) => ({ c, s: cityScore(c.name, intent) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);

  const candidates: Candidate[] = [];
  for (const { c: anchor } of scored.slice(0, 10)) {
    const stops = [anchor];
    // add neighbours (≤ 300 km) that score well, nearest-good first
    const neighbours = scored
      .filter((x) => x.c.name !== anchor.name && km(x.c, anchor) <= 300)
      .map((x) => ({ ...x, rank: x.s - km(x.c, anchor) / 80 }))
      .sort((a, b) => b.rank - a.rank);
    for (const n of neighbours) {
      if (stops.length >= want) break;
      if (stops.every((s) => km(s, n.c) > 25)) stops.push(n.c);
    }
    // start from the stop nearest an international gateway, then nearest-next
    const ordered = [stops.sort((a, b) => nearestGateway(a).d - nearestGateway(b).d)[0]];
    const rest = stops.slice(1);
    while (rest.length) {
      const last = ordered[ordered.length - 1];
      rest.sort((a, b) => km(last, a) - km(last, b));
      ordered.push(rest.shift()!);
    }
    const totalKm = ordered.slice(1).reduce((a, s, i) => a + km(ordered[i], s), 0);
    const score = ordered.reduce((a, s) => a + cityScore(s.name, intent), 0) - totalKm / 250;
    candidates.push({ stops: ordered, score, totalKm });
  }
  // de-duplicate by stop set
  const seen = new Set<string>();
  return candidates
    .filter((c) => {
      const key = c.stops.map((s) => s.name).sort().join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score);
}

function toOption(c: Candidate, intent: TripIntent): RouteOption {
  const days = intent.durationDays ?? 5;
  const nights = nightsSplit(days, c.stops.length);
  const used = new Set<string>();
  const highlights: Highlight[] = [];
  for (const s of c.stops) {
    for (const p of topPlacesFor(s.name, intent, used, 1)) {
      used.add(p.id);
      highlights.push(toHighlight(p, intent));
    }
  }
  for (const s of c.stops) {
    if (highlights.length >= 3) break;
    for (const p of topPlacesFor(s.name, intent, used, 1)) { used.add(p.id); highlights.push(toHighlight(p, intent)); }
  }
  const all = c.stops.flatMap((s) => topPlacesFor(s.name, intent, new Set(), 3));
  const avgCrowd = all.reduce((a, p) => a + p.crowd, 0) / Math.max(all.length, 1);
  const tagCounts = new Map<string, number>();
  for (const p of all) for (const t of p.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const tags = [
    ...intent.preferences.filter((p) => tagCounts.get(p)),
    ...[...tagCounts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t as Preference),
  ].filter((t, i, arr) => PREF_TH[t] && arr.indexOf(t) === i).slice(0, 2).map((t) => PREF_TH[t]);
  if (c.totalKm < 200) tags.push(PREF_TH.easy_travel);
  else if (avgCrowd <= 3) tags.push(PREF_TH.fewer_crowds);

  const gw = nearestGateway(c.stops[0]);
  const stops: RouteStop[] = c.stops.map((s, i) => ({ city: s.name, cityTh: s.th, lat: s.lat, lon: s.lon, nights: nights[i] }));
  return {
    id: c.stops.map((s) => s.name.toLowerCase()).join("-"),
    title: c.stops.map((s) => s.name).join(" → "),
    stops,
    highlights: highlights.slice(0, 3),
    tags: tags.slice(0, 3),
    reason: reasonFor(highlights, intent),
    tradeoff: c.totalKm > 350 ? "นั่งรถไฟหลายชั่วโมงกว่าเส้นอื่น" : avgCrowd >= 4.2 ? "จุดดังคนเยอะ ควรไปเช้า" : undefined,
    gateway: { city: gw.g.city, airport: gw.g.airport },
    totalKm: Math.round(c.totalKm),
  };
}

function reasonFor(h: Highlight[], intent: TripIntent) {
  const names = h.slice(0, 2).map((x) => x.name).join(" และ ");
  const why = intent.preferences.length
    ? `เน้น${intent.preferences.slice(0, 2).map((p) => PREF_TH[p]).join("+")}`
    : "จุดยอดนิยมครบ";
  return `${why} มี ${names}`;
}

/** Jev re-ranks code candidates against the traveller's own words. */
async function rerank(message: string, options: RouteOption[]): Promise<RouteOption[]> {
  if (!systemOneConfigured() || options.length <= 1) return options;
  try {
    const a = await askSystemOne(
      { request: message, options: options.map((o) => ({ title: o.title, highlights: o.highlights.map((h) => h.name), tags: o.tags })) },
      Object.fromEntries(options.map((o, i) => [`fit_${i}`, {
        type: "score" as const,
        instructions: `How well does option \`options[${i}]\` fit \`request\`?`,
        criteria: ["Poor fit", "Weak fit", "Reasonable fit", "Good fit", "Excellent fit"],
      }])),
      { timeoutMs: 3000 }, // optional polish: code order is a fine answer if Jev is slow
    );
    return options
      .map((o, i) => ({ o, s: a[`fit_${i}`].score }))
      .sort((x, y) => y.s - x.s)
      .map((x) => x.o);
  } catch {
    return options;
  }
}

export async function suggestRoutes(message: string, intent: TripIntent, avoidIds: string[] = []): Promise<RouteOption[]> {
  const candidates = buildCandidates(intent).slice(0, 8).map((c) => toOption(c, intent));
  const fresh = candidates.filter((o) => !avoidIds.includes(o.id));
  const pool = (fresh.length >= 3 ? fresh : candidates).slice(0, 6);
  const ranked = (await rerank(message, pool)).slice(0, 3);
  if (ranked[0]) ranked[0].recommended = true;
  return ranked;
}

/**
 * ≤3 extra stops near the route. When the traveller asked for something specific
 * (e.g. onsen), only places that actually match it qualify — an empty result is
 * reported honestly instead of silently substituting something else.
 */
export function suggestStops(route: RouteOption, intent: TripIntent, required: Preference[] = []): Highlight[] {
  const taken = new Set(route.highlights.map((h) => h.id));
  const cities = new Set(route.stops.map((s) => s.city));
  const matches = (p: Place) => required.every((r) => p.tags.includes(r) || TYPE_FOR_PREF[r]?.includes(p.type));
  return usablePlaces(intent)
    .filter((p) => cities.has(p.baseCity) && !taken.has(p.id) && matches(p))
    .map((p) => ({ p, s: placeFit(p, intent) - p.baseKm / 40 }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map(({ p }) => toHighlight(p, intent));
}

const MAX_DAYS = 21;

/**
 * Make the route's nights add up to the requested trip length (days − 1).
 * Too few nights for every stop → keep the first stops (one night each) rather
 * than silently dropping cities mid-plan; the caller tells the traveller.
 */
export function fitRouteToDays(route: RouteOption, days: number): { route: RouteOption; droppedStops: string[] } {
  const totalDays = Math.min(Math.max(Math.round(days), 1), MAX_DAYS);
  const nights = Math.max(totalDays - 1, 1);
  const keep = route.stops.slice(0, Math.min(route.stops.length, nights));
  const split = nightsSplit(totalDays, keep.length);
  return {
    route: { ...route, stops: keep.map((s, i) => ({ ...s, nights: split[i] })), title: keep.map((s) => s.city).join(" → ") },
    droppedStops: route.stops.slice(keep.length).map((s) => s.cityTh),
  };
}

export function draftItinerary(route: RouteOption, intent: TripIntent, extraStops: Highlight[] = []): ItineraryDay[] {
  const routeNights = route.stops.reduce((a, s) => a + s.nights, 0);
  const days = Math.min(Math.max(routeNights + 1, 1), MAX_DAYS);
  const plan: ItineraryDay[] = [];
  const used = new Set<string>();
  let day = 1;
  route.stops.forEach((stop, i) => {
    const staying = Math.max(stop.nights, 1);
    for (let n = 0; n < staying && day < days; n++, day++) {
      const items: ItineraryItem[] = [];
      // Parts of the day, not clock times: we have no live timetables (spec §2.2).
      if (day === 1) {
        const arrive = travelTime(`airport:${route.gateway.airport}`, stop.city);
        items.push({ kind: "move", slot: "morning", mode: "flight", text: `บินถึง${CITY_BY_NAME.get(route.gateway.city)?.th ?? route.gateway.city} แล้วเข้า${stop.cityTh}${arrive ? ` ประมาณ ${durationTh(arrive.minutes)}` : ""}`, approx: true, from: `airport:${route.gateway.airport}`, to: stop.city });
      } else if (n === 0) {
        const prev = route.stops[i - 1];
        // rail-times.ts: real connections (e.g. Kawaguchiko → Nikko goes via Tokyo, ~4 h); straight line only as a last resort
        const t = travelTime(prev.city, stop.city) ?? { minutes: (km(prev, stop) * 1.3 / 80) * 60 + 30, mode: "train" as const };
        items.push({ kind: "move", slot: "morning", mode: t.mode, text: `${prev.cityTh} → ${stop.cityTh} ประมาณ ${durationTh(t.minutes)}`, approx: true, from: prev.city, to: stop.city });
      }
      const extras = extraStops.filter((h) => h.city === stop.city && !used.has(h.id));
      const picks = [
        ...extras.map((h) => ({ id: h.id, name: h.name, wikiTitle: h.wikiTitle })),
        ...topPlacesFor(stop.city, intent, used, 3).map((p) => ({ id: p.id, name: p.nameEn, wikiTitle: p.wikiTitle })),
      ].slice(0, day === 1 || n === 0 ? 1 : 2);
      const sightSlots: DaySlot[] = items.length ? ["afternoon"] : ["morning", "afternoon"];
      picks.forEach((p, k) => { used.add(p.id); items.push({ kind: "see", slot: sightSlots[k] ?? "afternoon", text: p.name, placeId: p.id, wikiTitle: p.wikiTitle }); });
      items.push({ kind: "stay", slot: "evening", text: `พักที่ ${stop.cityTh}` });
      plan.push({ day, city: stop.city, title: n === 0 && i > 0 ? `${route.stops[i - 1].city} → ${stop.city}` : stop.city, items, photo: picks[0]?.wikiTitle });
    }
  });
  // departure day (a 1-day trip departs on the same day)
  const last = route.stops[route.stops.length - 1];
  const depart = travelTime(last.city, `airport:${nearestGateway(last).g.airport}`);
  if (plan.length < days) {
    plan.push({
      day: plan.length + 1, city: last.city, title: `${last.city} → กลับไทย`,
      items: [
        { kind: "move", slot: "morning", mode: "airport", text: `เดินทางไปสนามบิน${departureCity(route)}${depart ? ` ประมาณ ${durationTh(depart.minutes)}` : ""}`, approx: true, from: last.city, to: `airport:${nearestGateway(last).g.airport}` },
        { kind: "move", slot: "afternoon", mode: "flight", text: "บินกลับกรุงเทพ" },
      ],
    });
  }
  return plan;
}

// ── rebuild client-sent state from server data (never trust the client's copy) ──
const MAX_STOPS = 4;

export function restoreRoute(raw: unknown, intent?: TripIntent): RouteOption | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as { stops?: unknown; highlights?: unknown };
  if (!Array.isArray(r.stops)) return undefined;
  const stops: BaseCity[] = [];
  const nights: number[] = [];
  for (const s of r.stops.slice(0, MAX_STOPS)) {
    const city = s && typeof s === "object" ? CITY_BY_NAME.get(String((s as { city?: unknown }).city)) : undefined;
    if (!city || stops.some((x) => x.name === city.name)) continue;
    stops.push(city);
    const n = Number((s as { nights?: unknown }).nights);
    nights.push(Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 0), MAX_DAYS) : 1);
  }
  if (!stops.length) return undefined;
  const option = toOption({ stops, score: 0, totalKm: stops.slice(1).reduce((a, s, i) => a + km(stops[i], s), 0) }, intent ?? { preferences: [], focus: [] });
  const highlightIds = Array.isArray(r.highlights)
    ? r.highlights.map((h) => (h && typeof h === "object" ? String((h as { id?: unknown }).id) : "")).filter(Boolean)
    : [];
  const restored = highlightIds.map(placeById).filter((p): p is Place => !!p).slice(0, 3);
  return {
    ...option,
    stops: option.stops.map((s, i) => ({ ...s, nights: nights[i] })),
    highlights: restored.length ? restored.map((p) => toHighlight(p, intent ?? { preferences: [], focus: [] })) : option.highlights,
  };
}

export function restoreStops(raw: unknown, intent?: TripIntent): Highlight[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((id): id is string => typeof id === "string")
    .slice(0, 12)
    .map(placeById)
    .filter((p): p is Place => !!p)
    .map((p) => toHighlight(p, intent ?? { preferences: [], focus: [] }));
}

export function findPlaceByText(text: string): Place | undefined {
  const t = text.toLowerCase();
  return PLACES.filter((p) => p.nameEn.length >= 4 && t.includes(p.nameEn.toLowerCase().replace(/ (temple|shrine)$/, "")))
    .sort((a, b) => b.sitelinks - a.sitelinks)[0];
}

export function placeById(id: string) {
  return PLACES.find((p) => p.id === id);
}

export { CITY_BY_NAME };

/** Fly home from the airport nearest the last stop (not necessarily where the trip started). */
function departureCity(route: RouteOption) {
  const last = route.stops[route.stops.length - 1];
  const city = nearestGateway(last).g.city;
  return CITY_BY_NAME.get(city)?.th ?? city;
}
