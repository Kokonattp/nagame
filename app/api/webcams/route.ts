import { NextRequest, NextResponse } from "next/server";
import { getCityConfigBySlug } from "@/lib/cities/city-configs";
import { getWebcams } from "@/lib/services/webcams";
import { cacheHeaders } from "@/lib/utils/cache";

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lon = Number(request.nextUrl.searchParams.get("lon"));
  const slug = request.nextUrl.searchParams.get("slug") ?? "";

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat/lon ไม่ถูกต้อง" }, { status: 400 });
  }

  const webcam = await getWebcams(lat, lon, getCityConfigBySlug(slug));
  return NextResponse.json({ webcam }, { headers: cacheHeaders(1800) });
}
