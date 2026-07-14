// Supabase server client — ตัวกลางเก็บข้อมูลผู้ใช้ (Trip/ตรา/ความจำกร๊วก).
// ตาม [[nagame-redesign-direction]]: เจ้าของสั่ง "เว็บแต่เก็บข้อมูล" → backend persistence.
// สถาปัตยกรรม: browser → API route (ฝั่ง server) → Supabase ด้วย service key. ไม่ให้ client
// แตะ Supabase ตรง (service key ไม่หลุด, ไม่ต้องพึ่ง RLS ให้ถูก — server คุมเอง).
//
// สำคัญ: ถ้ายังไม่ตั้ง env (เจ้าของยังไม่สร้าง project) → คืน null. ทุกจุดที่เรียกต้องเช็ค null
// แล้ว fallback (client ใช้ localStorage เดิม). = เปิดใช้เมื่อพร้อม ไม่พังตอนยังไม่มี key.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) {
    cached = null;
    return null;
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}
