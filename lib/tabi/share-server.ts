// Rebuild a shared trip from its link code using server data only (see share.ts).

import { draftItinerary, fitRouteToDays, restoreRoute, restoreStops } from "./planner";
import { sanitizeIntent } from "./sanitize";
import { decodeShare, shareRef, tripTitle } from "./share";
import type { Highlight, ItineraryDay, RouteOption, TripIntent } from "./types";

export type SharedTrip = { ref: string; title: string; intent: TripIntent; route: RouteOption; itinerary: ItineraryDay[]; savedStops: Highlight[] };

export function buildSharedTrip(code: string): SharedTrip | null {
  const raw = decodeShare(code);
  if (!raw) return null;
  // a date that has passed is dropped by sanitizeIntent; the month still shapes the plan
  const intent = sanitizeIntent({ month: raw.i?.m, durationDays: raw.i?.n, startDate: raw.i?.d, preferences: raw.i?.p, focus: [] });
  const restored = restoreRoute({ stops: raw.s.map((s) => ({ city: Array.isArray(s) ? s[0] : undefined, nights: Array.isArray(s) ? s[1] : undefined })) }, intent);
  if (!restored) return null;
  const routeDays = restored.stops.reduce((a, s) => a + s.nights, 0) + 1;
  const { route } = fitRouteToDays(restored, intent.durationDays ?? routeDays);
  const savedStops = restoreStops(raw.x, intent);
  const itinerary = draftItinerary(route, intent, savedStops);
  return { ref: shareRef(code), title: tripTitle(route, itinerary.length), intent: { ...intent, durationDays: itinerary.length }, route, itinerary, savedStops };
}
