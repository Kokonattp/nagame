import { NextRequest, NextResponse } from "next/server";
import { getCityConfigBySlug } from "@/lib/cities/city-configs";
import { windowStatus } from "@/lib/cities/holidays";
import { japanHolidayWindows } from "@/lib/cities/holidays";
import { getCitySeasons } from "@/lib/cities/seasons";
import { getCityTransit } from "@/lib/cities/transit";
import { getRecommendationSets } from "@/lib/cities/travel-meta";
import { getDayPlan } from "@/lib/services/day-plan";
import { resolveCity } from "@/lib/services/geocode";
import { getWarnings } from "@/lib/services/warnings";
import { getWeather } from "@/lib/services/weather";
import { cacheHeaders } from "@/lib/utils/cache";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ error: "missing slug" }, { status: 400, headers: cacheHeaders(0) });
  }

  const city = await resolveCity(slug);
  if (!city) {
    return NextResponse.json({ error: "unknown city" }, { status: 404, headers: cacheHeaders(0) });
  }

  // ทุก signal ด้านล่างผ่าน cache ของตัวเองอยู่แล้ว — เส้นทางนี้จึงเบากว่าหน้าเพจมาก
  const config = getCityConfigBySlug(city.slug);
  const [weather, warnings] = await Promise.all([
    getWeather(city.lat, city.lon),
    getWarnings({ slug: city.slug, prefecture: city.prefecture }),
  ]);

  const sets = getRecommendationSets(city.name, city.prefecture, config?.recommendations ?? []);
  // กรอง generic (ชื่อที่ระบบแต่งเอง ไม่มีอยู่จริง) ออกก่อนเข้าแผนวัน —
  // ไม่งั้นแผนจะพาไปที่ที่ไม่มีอยู่. เมืองที่ไม่มีของจริงพอ → day-plan บอกว่ายังจัดให้ไม่ได้
  const candidates = [...sets.see, ...sets.do, ...sets.shop, ...sets.eat].filter((item) => !item.generic);

  const activeSeasons = getCitySeasons(city.slug)
    .filter((season) => windowStatus(season.from, season.to).state === "active")
    .map((season) => season.name);

  const holidayName =
    japanHolidayWindows.find((window) => windowStatus(window.from, window.to).state === "active")?.name ?? null;

  const plan = await getDayPlan({
    cityName: city.name,
    citySlug: city.slug,
    stationName: getCityTransit(city.slug)?.station.name,
    weather,
    warnings,
    activeSeasons,
    holidayName,
    candidates,
  });

  return NextResponse.json(plan, { headers: cacheHeaders(1800) });
}
