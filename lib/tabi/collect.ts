// Tabi's collectibles, kept on this device only (owner decision 2026-10-14, like trips):
// omamori (お守り) earned by planning steps, and a manhole-cover book — a city's cover opens when the
// city is in a trip and is stamped "มาถึงแล้ว" while that trip is happening. Art: public/tabi/collect,
// rendered from data/collect/designs.json by scripts/tabi-collect. Client only.

import designs from "@/data/collect/designs.json";

export type OmamoriDef = (typeof designs.omamori)[number];
export type ManholeDef = (typeof designs.manholes)[number];
export type OmamoriId = "kaiun" | "ryoko" | "kinun" | "enmusubi" | "gakugyo" | "shingan";

export const OMAMORI = designs.omamori as OmamoriDef[];
export const MANHOLES = designs.manholes as ManholeDef[];
export const omamoriImg = (id: string) => `/tabi/collect/omamori-${id}.webp`;
export const manholeImg = (city: string) => `/tabi/collect/manhole-${city.toLowerCase()}.webp`;

export type Collection = { omamori: Record<string, string>; stamped: Record<string, string> };
export type Earned = { kind: "omamori"; id: string } | { kind: "manhole"; id: string };

const KEY = "nagame-tabi-collect-v1";
export const EARNED_EVENT = "tabi:earned";
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

export function readCollection(): Collection {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Collection>;
    return { omamori: v.omamori ?? {}, stamped: v.stamped ?? {} };
  } catch {
    return { omamori: {}, stamped: {} };
  }
}

function save(c: Collection, earned: Earned) {
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* private mode: nothing kept */ }
  window.dispatchEvent(new CustomEvent<Earned>(EARNED_EVENT, { detail: earned }));
}

/** Give an omamori once; later calls do nothing. */
export function earnOmamori(id: OmamoriId) {
  if (typeof window === "undefined") return;
  const c = readCollection();
  if (c.omamori[id]) return;
  c.omamori[id] = today();
  save(c, { kind: "omamori", id });
}

export function stampManhole(city: string) {
  const c = readCollection();
  if (c.stamped[city]) return;
  c.stamped[city] = today();
  save(c, { kind: "manhole", id: city });
}

type TripLike = { intent: { startDate?: string; durationDays?: number }; itinerary?: unknown[]; route?: { stops: { city: string; nights: number }[] } };

/** Last day of a dated trip (inclusive), or null. */
function tripEnd(t: TripLike): string | null {
  const s = t.intent.startDate;
  if (!s) return null;
  const days = t.itinerary?.length ?? t.intent.durationDays ?? (t.route ? t.route.stops.reduce((a, x) => a + x.nights, 0) + 1 : 1);
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Math.max(days - 1, 0));
  return d.toISOString().slice(0, 10);
}

/** True while the trip is happening (start day to last day). */
export function travellingNow(t: TripLike): boolean {
  const end = tripEnd(t), now = today();
  return !!end && t.intent.startDate! <= now && now <= end;
}

/** Cities in any saved trip (opens their cover) and the cities of trips happening today (can be stamped). */
export function tripCities(trips: TripLike[]) {
  const planned = new Set<string>(), here = new Set<string>();
  for (const t of trips) for (const s of t.route?.stops ?? []) {
    planned.add(s.city);
    if (travellingNow(t)) here.add(s.city);
  }
  return { planned, here };
}
