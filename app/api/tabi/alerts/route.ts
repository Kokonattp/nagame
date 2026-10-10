import { NextRequest, NextResponse } from "next/server";
import { ALERT_CITIES, fetchAlerts } from "@/lib/tabi/alerts";

// /api/tabi/alerts?cities=Kyoto,Toyama → current JMA warnings (警報 or higher) for those base cities.
// Only known base cities are looked up, and JMA responses are cached 10 min server-side.

export async function GET(request: NextRequest) {
  const cities = (request.nextUrl.searchParams.get("cities") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter((c) => ALERT_CITIES.has(c))
    .slice(0, 6);
  if (!cities.length) return NextResponse.json({ alerts: [] });
  const alerts = await fetchAlerts(cities);
  return NextResponse.json({ alerts, checkedAt: new Date().toISOString() }, { headers: { "Cache-Control": "public, max-age=300" } });
}
