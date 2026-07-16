import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/db/supabase";
import { isSafeOutboundTarget, type OutboundKind } from "@/lib/outbound";

// /api/outbound — ท่อกลางของทุกลิงก์ออกนอกแอป: log click แล้ว 302 redirect ไปปลายทางจริง.
// GET ?to=<url>&kind=<kind>&label=<...>&city=<slug>
//
// dual-mode: มี Supabase → best-effort log ลง clickouts (ไม่ throw, ไม่บล็อก redirect);
// ไม่มี key → ข้าม log แล้ว redirect เลย. logging ห้ามทำให้ผู้ใช้ไปต่อไม่ได้.
//
// schema (supabase/schema.sql):
//   create table clickouts (
//     id bigint generated always as identity primary key,
//     device_id text, kind text, url text, label text, city_slug text,
//     ts bigint not null
//   );

export const dynamic = "force-dynamic"; // มี query ต่างกันทุกครั้ง + side effect log

const VALID_KINDS: OutboundKind[] = ["stay", "eat", "flight", "nav", "webcam", "place", "other"];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const target = params.get("to") ?? "";

  // ปลายทางไม่ปลอดภัย/ไม่มี → กลับหน้าแรก ดีกว่าเด้งไป scheme อันตราย
  if (!target || !isSafeOutboundTarget(target)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const rawKind = params.get("kind") ?? "other";
  const kind: OutboundKind = VALID_KINDS.includes(rawKind as OutboundKind) ? (rawKind as OutboundKind) : "other";
  const label = params.get("label")?.slice(0, 120) ?? null;
  const citySlug = params.get("city")?.slice(0, 80) ?? null;
  // device id ส่งมาทาง cookie/header ถ้ามี (client แนบให้) — ไม่มีก็ log เป็น null ได้
  // deviceId: อ่านจาก cookie ก่อน (client เขียนจาก localStorage) → fallback query param 'd'.
  // ⚠ KNOWN LIMITATION (Phase 1): card link ประกอบฝั่ง server (advisor) ที่ไม่รู้ deviceId
  // จึงยังไม่มี 'd' ในหลาย URL → clickout log เป็น device_id=null. attribution เต็มรูปแบบ
  // (funnel depth per device) จะสมบูรณ์ตอน Phase 2 ที่ย้าย identity → cookie/LINE Login พร้อมกัน.
  const deviceId = request.cookies.get("nagame_did")?.value?.slice(0, 80) ?? params.get("d")?.slice(0, 80) ?? null;

  // best-effort log — ห้าม await นาน/throw จนบล็อก redirect
  void logClickout({ deviceId, kind, url: target, label, citySlug });

  return NextResponse.redirect(target, 302);
}

async function logClickout(row: {
  deviceId: string | null;
  kind: OutboundKind;
  url: string;
  label: string | null;
  citySlug: string | null;
}): Promise<void> {
  try {
    const supabase = getSupabase();
    if (!supabase) return; // ไม่มี key = ข้าม (dual-mode)
    await supabase.from("clickouts").insert({
      device_id: row.deviceId,
      kind: row.kind,
      url: row.url.slice(0, 2000),
      label: row.label,
      city_slug: row.citySlug,
      ts: Date.now(),
    });
  } catch {
    // network/schema ยังไม่พร้อม → เงียบ, การ redirect สำคัญกว่าการ log
  }
}
