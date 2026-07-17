import { NextRequest, NextResponse } from "next/server";
import { getSupabase, isSupabaseConfigured } from "@/lib/db/supabase";

// /api/trip-meta — เมตาทริปต่อเมือง (วันเดินทาง + สัญญาณจอง) ผูกกับ anonymous device id.
// GET  ?deviceId=...                    → คืนเมตาทุกเมืองของ device
// POST { deviceId, citySlug, ...patch } → upsert เมตาของเมืองนั้น
//
// **ไม่เก็บ status** — derive จากวัน+สัญญาณจองตอนอ่านเสมอ (lib/game/trip-lifecycle.ts)
// เพราะ status เป็นฟังก์ชันของ "วันนี้": เก็บไว้จะ stale ทันทีที่ข้ามวัน.
//
// ถ้ายังไม่ตั้ง Supabase env → 503 → client ใช้ localStorage เดิม (delight layer ห้ามพังหน้า)
// ตาม pattern /api/trip.

export const dynamic = "force-dynamic"; // ข้อมูลผู้ใช้ ห้าม cache

type MetaRow = {
  device_id: string;
  city_slug: string;
  start_date: string | null;
  end_date: string | null;
  booked_manually: boolean;
  booked_signal_at: number | null;
  updated_at: number;
};

type PostBody = {
  deviceId?: string;
  citySlug?: string;
  startDate?: string | null;
  endDate?: string | null;
  bookedManually?: boolean;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function notConfigured() {
  return NextResponse.json({ error: "persistence-not-configured", meta: [] }, { status: 503 });
}

// รับเฉพาะ ISO date จริง — กันขยะลง DB (client ส่ง "" ตอนล้างช่อง → null)
function cleanDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!ISO_DATE.test(s)) return null;
  return Number.isNaN(new Date(`${s}T00:00:00`).getTime()) ? null : s;
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) return notConfigured();
  const deviceId = request.nextUrl.searchParams.get("deviceId")?.trim();
  if (!deviceId) return NextResponse.json({ error: "missing deviceId", meta: [] }, { status: 400 });

  const supabase = getSupabase();
  if (!supabase) return notConfigured();

  const { data, error } = await supabase.from("trip_meta").select("*").eq("device_id", deviceId);
  if (error) return NextResponse.json({ error: "db-error", meta: [] }, { status: 500 });

  const meta = (data as MetaRow[]).map((r) => ({
    citySlug: r.city_slug,
    startDate: r.start_date ?? undefined,
    endDate: r.end_date ?? undefined,
    bookedManually: r.booked_manually || undefined,
    bookedSignalAt: r.booked_signal_at ?? undefined,
  }));
  return NextResponse.json({ meta });
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return notConfigured();

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const deviceId = body.deviceId?.trim();
  const citySlug = body.citySlug?.trim();
  if (!deviceId || !citySlug) return NextResponse.json({ error: "missing deviceId/citySlug" }, { status: 400 });

  const supabase = getSupabase();
  if (!supabase) return notConfigured();

  const start = cleanDate(body.startDate);
  const end = cleanDate(body.endDate);
  // วันกลับก่อนวันไป = สลับให้ (ผู้ใช้พิมพ์กลับด้าน ไม่ควรเก็บของเพี้ยนลง DB)
  const [startDate, endDate] =
    start && end && new Date(`${end}T00:00:00`) < new Date(`${start}T00:00:00`) ? [end, start] : [start, end];

  const { error } = await supabase.from("trip_meta").upsert(
    {
      device_id: deviceId,
      city_slug: citySlug,
      start_date: startDate,
      end_date: endDate,
      booked_manually: Boolean(body.bookedManually),
      updated_at: Date.now(),
    },
    { onConflict: "device_id,city_slug" },
  );

  if (error) return NextResponse.json({ error: "db-error" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
