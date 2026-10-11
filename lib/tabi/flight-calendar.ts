// Cheapest departure dates per month (server only — the calendar is ~100 KB, the client gets 3 rows).
// Data: workers/flight-prices/calendar.mjs (Google Flights price graph, collected on the owner's PC).

import calendar from "@/data/flights/calendar.json";

type Row = { gateway: string; days: number; depart: string; back: string; price: number };
const CAL = calendar as { checkedAt: string; rows: Row[] };

export type DateOption = { depart: string; back: string; price: number };

/**
 * Three cheapest departures in `month` for a trip of `days` (nearest collected length), spread
 * at least 3 days apart so the choices differ; null when the calendar is stale (>14 days) or empty.
 */
export function cheapestDates(gateway: string, month: number, days = 5): { days: number; checkedAt: string; options: DateOption[] } | null {
  if (Date.now() - new Date(CAL.checkedAt).getTime() > 14 * 86_400_000) return null;
  const lengths = [...new Set(CAL.rows.filter((r) => r.gateway === gateway).map((r) => r.days))];
  if (!lengths.length) return null;
  const length = lengths.reduce((a, b) => (Math.abs(b - days) < Math.abs(a - days) ? b : a));
  const soonest = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  const pool = CAL.rows
    .filter((r) => r.gateway === gateway && r.days === length && Number(r.depart.slice(5, 7)) === month && r.depart >= soonest)
    .sort((a, b) => a.price - b.price);
  const options: DateOption[] = [];
  for (const r of pool) {
    if (options.some((o) => Math.abs(new Date(o.depart).getTime() - new Date(r.depart).getTime()) < 3 * 86_400_000)) continue;
    options.push({ depart: r.depart, back: r.back, price: r.price });
    if (options.length === 3) break;
  }
  return options.length ? { days: length, checkedAt: CAL.checkedAt, options } : null;
}
