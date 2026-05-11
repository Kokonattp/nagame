import { NextRequest, NextResponse } from "next/server";
import { getCityConfigBySlug } from "@/lib/cities/city-configs";
import { getAqi } from "@/lib/services/aqi";
import { getAiSummary } from "@/lib/services/ai-summary";
import { getEvents } from "@/lib/services/events";
import { getWebcams } from "@/lib/services/webcams";
import { getWeather } from "@/lib/services/weather";
import { cacheHeaders } from "@/lib/utils/cache";

export async function GET(request: NextRequest) {
  const cityName = request.nextUrl.searchParams.get("city") ?? "เมืองนี้";
  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lon = Number(request.nextUrl.searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat/lon ไม่ถูกต้อง" }, { status: 400 });
  }

  const cityConfig = getCityConfigBySlug(slug);
  const [weather, aqi, webcam, events] = await Promise.all([
    getWeather(lat, lon),
    getAqi(lat, lon),
    getWebcams(lat, lon, cityConfig),
    getEvents(cityConfig),
  ]);

  const summary = await getAiSummary({
    cityName,
    cityConfig,
    weather,
    aqi,
    webcam,
    events,
  });

  return NextResponse.json({ summary }, { headers: cacheHeaders(2700) });
}
