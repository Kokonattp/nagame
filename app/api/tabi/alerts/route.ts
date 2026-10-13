import { NextRequest, NextResponse } from "next/server";
import { CITY_BY_NAME } from "@/lib/tabi/cities";
import { fetchSafety } from "@/lib/tabi/safety";

// /api/tabi/alerts?cities=Kyoto,Toyama → what a traveller on those base cities must know now:
// JMA weather warnings (警報+), shindo 5-+ quakes in their prefectures (24 h), tsunami warnings
// (24 h) and volcano warnings for their towns. Only known base cities; JMA cached 5–10 min.

export async function GET(request: NextRequest) {
  const cities = (request.nextUrl.searchParams.get("cities") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter((c) => CITY_BY_NAME.has(c))
    .slice(0, 8);
  if (!cities.length) return NextResponse.json({ alerts: [], events: [] });
  const { alerts, events } = await fetchSafety(cities);
  return NextResponse.json({ alerts, events, checkedAt: new Date().toISOString() }, { headers: { "Cache-Control": "public, max-age=300" } });
}
