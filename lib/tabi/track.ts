// Anonymous product events for the trip funnel (docs/analytics/tabi-funnel.md).
// A random per-browser id only — no name, email, IP or message text is ever sent.
// Fire-and-forget: tracking can never slow down or break the app.

export const TABI_EVENTS = [
  "home_view", "ask", "routes_shown", "route_opened", "stop_added", "itinerary_drafted", "date_set",
  "flights_opened", "flight_clicked", "leg_map_clicked", "trip_shared", "shared_trip_opened",
  "shared_trip_saved", "tour_done", "tour_skipped", "plan_edited", "question_answered",
] as const;
export type TabiEvent = (typeof TABI_EVENTS)[number];
export type EventProps = Partial<Record<"month" | "days" | "stops" | "route" | "source" | "method" | "step" | "first" | "refine" | "ref", string | number | boolean>>;

const SID_KEY = "nagame-tabi-sid";

function sessionId() {
  try {
    let sid = localStorage.getItem(SID_KEY);
    if (!sid) { sid = crypto.randomUUID(); localStorage.setItem(SID_KEY, sid); }
    return sid;
  } catch {
    return "no-storage";
  }
}

export function track(event: TabiEvent, props: EventProps = {}) {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({ event, props, sid: sessionId(), path: location.pathname.slice(0, 40) });
    const sent = navigator.sendBeacon?.("/api/tabi/event", new Blob([body], { type: "application/json" }));
    if (!sent) void fetch("/api/tabi/event", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
  } catch { /* never let analytics break the app */ }
}
