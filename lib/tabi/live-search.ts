// Live look-ups through the live-search worker (workers/live-search): Jev UltraFast in a normal
// Chrome, for flights, train fares, restaurants, stays, shops and sights; the snapshots and the guide
// answer whenever it is busy, over its cap, blocked or down.
// Off unless LIVE_SEARCH_URL and LIVE_SEARCH_TOKEN are set. Only a destination, dates or an area
// and a dish go out — nothing about the traveller. Server only.

export type LiveFlight = { cheapest: number | null; nonstop: { price: number; airline: string; duration: string; route: string } | null; results: number; url: string; checkedAt: string };
export type LivePlace = { n: string; r: number; rc: number; la: number; lo: number; cat: string; url: string; price?: { cur: "THB" | "JPY"; amount: number } | null };
export type LivePlaces = { places: LivePlace[]; url: string; checkedAt: string };
export type LiveRail = { yen: number | null; duration: string | null; line: string | null; url: string; checkedAt: string };
export type LiveKind = "eat" | "stay" | "buy" | "sight";
type Failure = { error: "busy" | "cap" | "blocked" | "failed" };

export const liveConfigured = () => Boolean(process.env.LIVE_SEARCH_URL && process.env.LIVE_SEARCH_TOKEN);

async function call<T>(body: object): Promise<T | Failure> {
  try {
    const r = await fetch(`${process.env.LIVE_SEARCH_URL!.replace(/\/$/, "")}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.LIVE_SEARCH_TOKEN}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(50_000),
    });
    if (r.status === 429) return { error: ((await r.json().catch(() => ({}))) as { error?: string }).error === "busy" ? "busy" : "cap" };
    if (r.status === 503) return { error: "blocked" };
    if (!r.ok) return { error: "failed" };
    return (await r.json()) as T;
  } catch {
    return { error: "failed" };
  }
}

export const liveFlight = (to: string, depart: string, back: string) => call<LiveFlight>({ kind: "flight", to, depart, back });
export const livePlaces = (kind: LiveKind, area: string, what: string) => call<LivePlaces>({ kind, area, what });
/** Google Maps public transport between two stations, leaving 10:00 tomorrow: fare, time, line */
export const liveRail = (from: string, to: string) => call<LiveRail>({ kind: "rail", from, to });
