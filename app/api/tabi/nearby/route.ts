import { NextResponse } from "next/server";
import { CITY_BY_NAME } from "@/lib/tabi/cities";
import { nearbyPins } from "@/lib/tabi/eat-buy";

// Stays and restaurants from the guide (Wikivoyage, CC BY-SA) for the route's cities, as map pins.
// GET /api/tabi/nearby?cities=Kyoto,Osaka — the full listing stays on the server; only pins go out.
export async function GET(req: Request) {
  const cities = (new URL(req.url).searchParams.get("cities") ?? "")
    .split(",")
    .filter((c) => CITY_BY_NAME.has(c))
    .slice(0, 8);
  return NextResponse.json({ pins: nearbyPins(cities) }, { headers: { "Cache-Control": "public, max-age=86400" } });
}
