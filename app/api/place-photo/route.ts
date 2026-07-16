import { NextRequest, NextResponse } from "next/server";

// /api/place-photo — proxy รูปจาก Google Places Photo endpoint โดยไม่ให้ API key หลุดไป client.
// card ส่ง imageUrl = /api/place-photo?name=<photo resource> → ฝั่ง server แนบ key แล้ว
// redirect ไป URL รูปจริง (lh3.googleusercontent — ไม่มี key). ตาม Fable B1 (security).
//
// dual-mode: ไม่มี key → 404 (card ก็แค่ไม่มีรูป ไม่พัง). cache นาน (รูปร้านไม่เปลี่ยน).

export const revalidate = 86400;

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  const key = process.env.GOOGLE_PLACES_API_KEY;

  // photo resource name ของ Places API (New) รูปแบบ "places/XXX/photos/YYY" — กันค่าแปลกปลอม
  if (!key || !name || !/^places\/[\w-]+\/photos\/[\w-]+$/.test(name)) {
    return new NextResponse(null, { status: 404 });
  }

  const target = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=640&key=${key}`;
  try {
    // skipHttpRedirect=false (default) → Google 302 ไป lh3 URL ที่ไม่มี key; เรา follow แล้วส่งต่อ
    const res = await fetch(target, { redirect: "follow", next: { revalidate } });
    if (!res.ok) return new NextResponse(null, { status: 404 });
    // redirect client ไป URL สุดท้าย (ไม่มี key) — เบากว่า stream ตัวรูปผ่าน server
    return NextResponse.redirect(res.url, 302);
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
