// Flight price snapshots collected on the owner's PC (workers/flight-prices/collect.mjs):
// Bangkok ⇄ each gateway, one sample round trip per month. Shown as "prices Tabi checked
// on <date>" beside the live Google Flights link — never as a live or guaranteed fare.

import snapshot from "@/data/flights/snapshot.json";

export type FlightSnap = {
  gateway: string;
  month: string; // "YYYY-MM"
  depart: string;
  back: string;
  cheapest: number | null;
  nonstop: { price: number; airline: string; duration: string; route: string } | null;
  results: number;
};

// Google prints codeshares glued together ("THAIANA", "JALBangkok Airways"): split known names
const AIRLINES = ["Thai AirAsia X", "Thai AirAsia", "Thai Vietjet Air", "Thai Lion Air", "Bangkok Airways", "Singapore Airlines", "Cathay Pacific",
  "China Airlines", "Korean Air", "EVA Air", "Air Japan", "Vietjet", "ZIPAIR", "Peach", "THAI", "ANA", "JAL"];
export function splitAirlines(raw: string): string {
  const out: string[] = [];
  let rest = raw.replace(/\s*\(.*\)$/, "");
  const tail = raw.match(/\s*(\(.*\))$/)?.[1];
  while (rest) {
    const hit = AIRLINES.find((a) => rest.startsWith(a));
    if (!hit) { out.push(rest); break; }
    out.push(hit);
    rest = rest.slice(hit.length).trim();
  }
  return out.join(" / ") + (tail ? ` ${tail}` : "");
}

const RAW = snapshot as { checkedAt: string; routes: FlightSnap[] };
const SNAP = { ...RAW, routes: RAW.routes.map((r) => (r.nonstop ? { ...r, nonstop: { ...r.nonstop, airline: splitAirlines(r.nonstop.airline) } } : r)) };
export const FLIGHTS_CHECKED_AT = SNAP.checkedAt;

/** Days since the snapshot was taken; older than ~2 weeks is not worth showing. */
export const snapshotAgeDays = () => Math.floor((Date.now() - new Date(SNAP.checkedAt).getTime()) / 86_400_000);

/**
 * The sample for this gateway in the trip's month (any year), else the cheapest month on file.
 * `exact` tells the UI whether it is the traveller's month or a nearby suggestion.
 */
export function flightSnapFor(gateway: string, month?: number): { snap: FlightSnap; exact: boolean } | null {
  if (snapshotAgeDays() > 14) return null;
  const rows = SNAP.routes.filter((r) => r.gateway === gateway && r.cheapest);
  if (!rows.length) return null;
  const same = month ? rows.find((r) => Number(r.month.slice(5, 7)) === month) : undefined;
  if (same) return { snap: same, exact: true };
  return { snap: rows.reduce((a, b) => (b.cheapest! < a.cheapest! ? b : a)), exact: false };
}
