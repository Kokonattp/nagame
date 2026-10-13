import { NextRequest, NextResponse } from "next/server";
import { CITY_BY_NAME } from "@/lib/tabi/cities";
import { liveConfigured, liveRail } from "@/lib/tabi/live-search";
import { stationFor } from "@/lib/tabi/transport";

// /api/tabi/fares?legs=Kyoto>Osaka,Osaka>Kinosaki → the train fare, time and line of each leg, checked
// live on Google Maps (public transport leaving 10:00 tomorrow) by the live-search worker. Only legs
// between two railway stations are looked up; the worker caches each for 30 days. Without the worker
// this returns { legs: [] } and the app keeps its fare table.

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const legs = (request.nextUrl.searchParams.get("legs") ?? "")
    .split(",")
    .map((l) => l.split(">").map((c) => c.trim()))
    .filter((l): l is [string, string] => l.length === 2 && l.every((c) => CITY_BY_NAME.has(c)) && l[0] !== l[1])
    .slice(0, 6);
  if (!legs.length || !liveConfigured()) return NextResponse.json({ legs: [] });
  const out = [];
  for (const [a, b] of legs) { // one Chrome behind the worker: one leg at a time
    const from = stationFor(a), to = stationFor(b);
    if (!/ Station$/.test(from) || !/ Station$/.test(to)) { out.push(null); continue; }
    const r = await liveRail(from, to);
    out.push("error" in r || !r.yen ? null : { from: a, to: b, yen: r.yen, duration: r.duration, line: r.line, checkedAt: r.checkedAt });
  }
  return NextResponse.json({ legs: out }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
