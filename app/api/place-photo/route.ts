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

  // ขอ URL รูปจริงผ่าน skipHttpRedirect=true → Google คืน JSON {photoUri} ที่เป็น lh3 URL
  // (ไม่มี key) แทนการ 302. เราส่ง photoUri นั้นให้ client redirect ต่อ — ไม่มีทางที่ key
  // จะโผล่ใน URL ที่ client เห็น (เดิม redirect ไป res.url อาจ = target ที่มี key ถ้า Google
  // ตอบ 200 ตรง ๆ ไม่ redirect).
  const metaUrl = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=640&skipHttpRedirect=true&key=${key}`;
  try {
    const res = await fetch(metaUrl, { next: { revalidate } });
    if (!res.ok) return new NextResponse(null, { status: 404 });
    const data = (await res.json()) as { photoUri?: string };
    // photoUri ต้องเป็น googleusercontent (ไม่มี key) — กันเผลอ redirect ไป URL ที่มี key
    if (!data.photoUri || data.photoUri.includes("key=") || !/^https:\/\//.test(data.photoUri)) {
      return new NextResponse(null, { status: 404 });
    }
    return NextResponse.redirect(data.photoUri, 302);
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
