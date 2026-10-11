import { NextRequest, NextResponse } from "next/server";
import { CITY_BY_NAME } from "@/lib/tabi/cities";
import { alternativePlace } from "@/lib/tabi/planner";
import { sanitizeIntent } from "@/lib/tabi/sanitize";

// GET /api/tabi/alternative?city=Kyoto&month=11&prefs=culture,nature&exclude=Q1,Q2
// → the next best sight in that base city that is not already in the plan (day-plan swap / add).
// Pure lookup in the place store: no model call, cacheable per query.

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const city = q.get("city") ?? "";
  if (!CITY_BY_NAME.has(city)) return NextResponse.json({ place: null }, { status: 400 });
  const intent = sanitizeIntent({
    month: Number(q.get("month")) || undefined,
    preferences: (q.get("prefs") ?? "").split(",").filter(Boolean),
    focus: [],
  });
  const exclude = (q.get("exclude") ?? "").split(",").filter((id) => /^(Q\d{1,12}|wv-[a-z0-9-]{1,60})$/.test(id)).slice(0, 60);
  const place = alternativePlace(city, intent, exclude) ?? null;
  return NextResponse.json({ place }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
