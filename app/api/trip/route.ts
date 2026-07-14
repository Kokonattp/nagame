import { NextRequest, NextResponse } from "next/server";
import { getSupabase, isSupabaseConfigured } from "@/lib/db/supabase";

// /api/trip — เก็บทริปของผู้ใช้ (anonymous device id) ลง Supabase.
// GET  ?deviceId=...        → คืนรายการทริปทั้งหมดของ device
// POST { deviceId, items }  → replace ทริปทั้งชุดของ device (idempotent, client เป็นเจ้าของ state)
//
// ถ้ายังไม่ตั้ง Supabase env → 503 "not configured" → client fallback localStorage เดิม
// (Trip เป็น delight layer: ไม่พังหน้า, แค่ไม่ sync ข้ามเครื่อง).
//
// Schema (รันใน Supabase SQL editor ก่อนใช้ — ดู supabase/schema.sql):
//   create table trips (
//     device_id text, item_id text, city_slug text, city_name text,
//     title text, area text, kind text, emoji text, added_at bigint,
//     primary key (device_id, item_id)
//   );

export const dynamic = "force-dynamic"; // ข้อมูลผู้ใช้ ห้าม cache

type TripRow = {
  device_id: string;
  item_id: string;
  city_slug: string;
  city_name: string;
  title: string;
  area: string;
  kind: string;
  emoji: string;
  added_at: number;
};

type PostBody = {
  deviceId?: string;
  items?: {
    id: string;
    citySlug: string;
    cityName: string;
    title: string;
    area: string;
    kind: string;
    emoji: string;
    addedAt: number;
  }[];
};

const MAX_ITEMS = 500; // กันยัดข้อมูลบวม

function notConfigured() {
  return NextResponse.json({ error: "persistence-not-configured", items: [] }, { status: 503 });
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) return notConfigured();
  const deviceId = request.nextUrl.searchParams.get("deviceId")?.trim();
  if (!deviceId) return NextResponse.json({ error: "missing deviceId", items: [] }, { status: 400 });

  const supabase = getSupabase();
  if (!supabase) return notConfigured();

  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("device_id", deviceId)
    .order("added_at", { ascending: true });

  if (error) return NextResponse.json({ error: "db-error", items: [] }, { status: 500 });

  const items = (data as TripRow[]).map((r) => ({
    id: r.item_id,
    citySlug: r.city_slug,
    cityName: r.city_name,
    title: r.title,
    area: r.area,
    kind: r.kind,
    emoji: r.emoji,
    addedAt: r.added_at,
  }));
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return notConfigured();
  const body = (await request.json()) as PostBody;
  const deviceId = body.deviceId?.trim();
  if (!deviceId) return NextResponse.json({ error: "missing deviceId" }, { status: 400 });
  const items = Array.isArray(body.items) ? body.items.slice(0, MAX_ITEMS) : [];

  const supabase = getSupabase();
  if (!supabase) return notConfigured();

  // replace ทั้งชุด: ลบของเดิมของ device แล้วใส่ใหม่ (client ถือ source of truth)
  const del = await supabase.from("trips").delete().eq("device_id", deviceId);
  if (del.error) return NextResponse.json({ error: "db-error" }, { status: 500 });

  if (items.length > 0) {
    const rows: TripRow[] = items.map((it) => ({
      device_id: deviceId,
      item_id: it.id,
      city_slug: it.citySlug,
      city_name: it.cityName,
      title: it.title,
      area: it.area,
      kind: it.kind,
      emoji: it.emoji,
      added_at: it.addedAt,
    }));
    const ins = await supabase.from("trips").insert(rows);
    if (ins.error) return NextResponse.json({ error: "db-error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: items.length });
}
