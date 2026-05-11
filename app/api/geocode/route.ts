import { NextRequest, NextResponse } from "next/server";
import { resolveCity } from "@/lib/services/geocode";
import { cacheHeaders } from "@/lib/utils/cache";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const city = await resolveCity(query);

  if (!city) {
    return NextResponse.json(
      { error: "ไม่พบเมืองนี้ในญี่ปุ่น", city: null },
      { status: 404, headers: cacheHeaders(300) },
    );
  }

  return NextResponse.json({ city }, { headers: cacheHeaders(86400) });
}
