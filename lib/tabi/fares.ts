// Rail fares between base cities, only where a 2026 or operator source exists
// (data/transport/fares.json). A leg is priced only when every hop on its route is known;
// otherwise the UI says "ดูราคาใน Google Maps" — Tabi never guesses a fare.

import faresData from "@/data/transport/fares.json";
import { travelTime } from "./rail-times";

type FareRow = { from: string; to: string; min: number; max: number; how: string; source: string };
const ROWS = faresData.fares as FareRow[];
export const FARES_CHECKED = faresData.checked;

const key = (a: string, b: string) => [a, b].sort().join("|");
const BY_PAIR = new Map(ROWS.map((r) => [key(r.from, r.to), r]));

export type LegFare = { min: number; max: number; sources: string[] };

/** Fare range for a city → city leg (airports excluded), or null when any hop is unknown. */
export function legFare(from: string, to: string): LegFare | null {
  if (from.startsWith("airport:") || to.startsWith("airport:")) return null;
  const direct = BY_PAIR.get(key(from, to));
  if (direct) return { min: direct.min, max: direct.max, sources: [direct.source] };
  const path = travelTime(from, to)?.path;
  if (!path || path.length < 2) return null;
  let min = 0;
  let max = 0;
  const sources: string[] = [];
  for (let i = 1; i < path.length; i++) {
    const r = BY_PAIR.get(key(path[i - 1], path[i]));
    if (!r) return null;
    min += r.min;
    max += r.max;
    sources.push(r.source);
  }
  return { min, max, sources: [...new Set(sources)] };
}

/** "¥4,200" or "¥13,320–14,170" */
export const yenRange = (f: { min: number; max: number }) =>
  f.min === f.max ? `¥${f.min.toLocaleString("en-US")}` : `¥${f.min.toLocaleString("en-US")}–${f.max.toLocaleString("en-US")}`;
