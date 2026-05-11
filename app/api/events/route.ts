import { NextRequest, NextResponse } from "next/server";
import { getCityConfigBySlug } from "@/lib/cities/city-configs";
import { getEvents } from "@/lib/services/events";
import { cacheHeaders } from "@/lib/utils/cache";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  const events = await getEvents(getCityConfigBySlug(slug));
  return NextResponse.json({ events }, { headers: cacheHeaders(1800) });
}
