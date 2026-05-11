import { NextRequest, NextResponse } from "next/server";
import { getAqi } from "@/lib/services/aqi";
import { cacheHeaders } from "@/lib/utils/cache";

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lon = Number(request.nextUrl.searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat/lon ไม่ถูกต้อง" }, { status: 400 });
  }

  const aqi = await getAqi(lat, lon);
  return NextResponse.json({ aqi }, { headers: cacheHeaders(1800) });
}
