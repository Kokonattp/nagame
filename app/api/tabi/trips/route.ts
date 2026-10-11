import { NextResponse, type NextRequest } from "next/server";
import { currentUserId } from "@/auth";
import { getSupabase } from "@/lib/db/supabase";

// Signed-in trip sync (table tabi_trips, supabase/schema.sql). The user id always comes from the
// session cookie, never from the request, so one person can only read or change their own trips.
//   GET     → { trips: SavedTrip[] }
//   PUT     → body { trip } (one trip, ≤ 200 KB), upsert by trip.id
//   DELETE  → removes every trip of this user (profile → "ลบข้อมูลทั้งหมด")
// 401 when signed out, 503 when the database is not configured yet.

export const dynamic = "force-dynamic";
const MAX_BYTES = 200_000;
const MAX_TRIPS = 200;

async function context() {
  const userId = await currentUserId();
  if (!userId) return { error: NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 }) };
  const db = getSupabase();
  if (!db) return { error: NextResponse.json({ error: "ยังไม่ได้เปิดระบบเก็บทริปออนไลน์" }, { status: 503 }) };
  return { userId, db };
}

export async function GET() {
  const c = await context();
  if ("error" in c) return c.error;
  const [{ data, error }, reset] = await Promise.all([
    c.db.from("tabi_trips").select("data").eq("user_id", c.userId).order("updated_at", { ascending: false }).limit(MAX_TRIPS),
    c.db.from("tabi_account_resets").select("reset_at").eq("user_id", c.userId).maybeSingle(),
  ]);
  if (error) return NextResponse.json({ error: "โหลดทริปไม่สำเร็จ ลองใหม่อีกครั้งนะ" }, { status: 500 });
  // resetAt: other devices drop copies older than the last "delete everything"
  return NextResponse.json({ trips: (data ?? []).map((r) => r.data), resetAt: reset.data?.reset_at ?? null });
}

export async function PUT(request: NextRequest) {
  const c = await context();
  if ("error" in c) return c.error;
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BYTES) return NextResponse.json({ error: "ทริปใหญ่เกินไป" }, { status: 413 });
  let trip: { id?: unknown; updatedAt?: unknown };
  try {
    trip = (JSON.parse(raw) as { trip?: typeof trip }).trip ?? {};
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกรูปแบบ" }, { status: 400 });
  }
  if (typeof trip.id !== "string" || !/^[\w-]{8,64}$/.test(trip.id)) return NextResponse.json({ error: "ข้อมูลไม่ถูกรูปแบบ" }, { status: 400 });
  const updatedAt = typeof trip.updatedAt === "string" && !Number.isNaN(Date.parse(trip.updatedAt)) ? trip.updatedAt : new Date().toISOString();
  // a new trip id must stay under the per-account cap (protects the shared database)
  const { data: existing } = await c.db.from("tabi_trips").select("trip_id").eq("user_id", c.userId).eq("trip_id", trip.id).maybeSingle();
  if (!existing) {
    const { count } = await c.db.from("tabi_trips").select("trip_id", { count: "exact", head: true }).eq("user_id", c.userId);
    if ((count ?? 0) >= MAX_TRIPS) return NextResponse.json({ error: `เก็บได้สูงสุด ${MAX_TRIPS} ทริป ลบทริปเก่าก่อนนะ` }, { status: 409 });
  }
  const { error } = await c.db.from("tabi_trips").upsert({ user_id: c.userId, trip_id: trip.id, data: trip, updated_at: updatedAt });
  if (error) return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

export async function DELETE() {
  const c = await context();
  if ("error" in c) return c.error;
  const { error } = await c.db.from("tabi_trips").delete().eq("user_id", c.userId);
  if (error) return NextResponse.json({ error: "ลบไม่สำเร็จ ลองใหม่อีกครั้งนะ" }, { status: 500 });
  await c.db.from("tabi_account_resets").upsert({ user_id: c.userId, reset_at: new Date().toISOString() });
  return new NextResponse(null, { status: 204 });
}
