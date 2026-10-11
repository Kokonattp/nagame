// Share links carry the trip itself (no server storage): /t/<code>, where code is base64url
// JSON of cities + nights, intent and kept stops. The server rebuilds the plan from its own
// data (share-server.ts), so a crafted code can only select real places, never inject text.

import type { Highlight, ItineraryDay, RouteOption, TripIntent } from "./types";

export type SharePayload = {
  v: 1;
  s: [city: string, nights: number][];
  i: { m?: number; n?: number; d?: string; p?: string[] };
  x?: string[];
  /** sights per day after the traveller's swaps/removals (place ids) */
  e?: string[][];
};

const MAX_CODE = 1200;

export function encodeShare(trip: { intent: TripIntent; route?: RouteOption; savedStops: Highlight[]; itinerary?: ItineraryDay[] }): string | null {
  if (!trip.route) return null;
  const payload: SharePayload = {
    v: 1,
    s: trip.route.stops.map((s) => [s.city, s.nights]),
    i: {
      m: trip.intent.month,
      n: trip.itinerary?.length ?? trip.intent.durationDays,
      d: trip.intent.startDate,
      p: trip.intent.preferences.length ? trip.intent.preferences : undefined,
    },
    x: trip.savedStops.length ? trip.savedStops.map((h) => h.id) : undefined,
    e: trip.itinerary?.map((d) => d.items.filter((it) => it.kind === "see" && it.placeId).map((it) => it.placeId as string)),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const b64 = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return b64.length <= MAX_CODE ? b64 : null;
}

export function decodeShare(code: string): SharePayload | null {
  if (!code || code.length > MAX_CODE || !/^[A-Za-z0-9_-]+$/.test(code)) return null;
  try {
    const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    const raw = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    if (raw?.v !== 1 || !Array.isArray(raw.s)) return null;
    return raw as SharePayload;
  } catch {
    return null;
  }
}

/** Same id for the sender's "shared" event and the receiver's "opened" event (share → open rate). */
export function shareRef(code: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < code.length; i++) h = Math.imul(h ^ code.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function tripTitle(route: Pick<RouteOption, "stops"> | undefined, days?: number) {
  if (!route) return "ทริปญี่ปุ่น";
  const nights = route.stops.reduce((a, s) => a + s.nights, 0);
  const first = route.stops[0].city;
  const last = route.stops[route.stops.length - 1].city;
  return `${first === last ? first : `${first} → ${last}`} · ${days ?? nights + 1} วัน`;
}
