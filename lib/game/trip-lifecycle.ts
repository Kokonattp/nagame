// Trip lifecycle — ยกระดับ "กองที่อยากไป" (TripItem) เป็น Trip ที่มีวันเดินทาง + สถานะ.
// PREREQ ของ Phase 3 ตาม docs/chat-cards-roadmap.md: Trip เดิมไม่มี "วันเดินทาง" เลยในระบบ
// (TripItem มีแค่ชื่อ/เมือง) → วัดอะไรไม่ได้, กร๊วกทักถูกจังหวะไม่ได้.
//
// หลักการที่ห้ามหลุด (roadmap):
//   **status ขยับจากเหตุการณ์จริง ไม่ใช่ปุ่มกด** — ปลอมไม่ได้ = game signal ที่ซื่อสัตย์
//   dream    = มีของในทริป แต่ยังไม่ใส่วัน
//   planning = ใส่วันแล้ว
//   booked   = มี clickout kind=stay/flight (จองจริง) หรือกดปุ่ม "จองแล้ว" เอง
//   flying   = ถึงวันเดินทางแล้ว (วันนี้อยู่ในช่วง)
//   done     = เลยวันกลับแล้ว
//
// identity = device id ล้วน (เจ้าของตัด LINE Login ออก 2026-07-17) — ยอมรับว่าล้าง cookie
// + localStorage พร้อมกัน = ของหาย. ของอยู่ Supabase ผูก device_id อยู่แล้ว.

import { getTrip, type TripItem } from "@/lib/game/trip";
import { getDeviceId } from "@/lib/game/identity";

export type TripStatus = "dream" | "planning" | "booked" | "flying" | "done";

/** เมตาของทริปหนึ่งเมือง — เก็บแยกจาก TripItem (item เดิมไม่ต้องแก้ schema) */
export type TripMeta = {
  citySlug: string;
  /** ISO date "YYYY-MM-DD" — undefined = ยังไม่ใส่วัน (dream) */
  startDate?: string;
  endDate?: string;
  /** ผู้ใช้กด "จองแล้ว" เอง (fallback ของ clickout — บาง booking ไม่ผ่านลิงก์เรา) */
  bookedManually?: boolean;
  /** epoch ms ของ clickout kind=stay|flight ล่าสุด (มาจาก server) — ปลอมไม่ได้ */
  bookedSignalAt?: number;
};

export type Trip = TripMeta & {
  cityName: string;
  items: TripItem[];
  status: TripStatus;
  /** วันจนถึงวันออกเดินทาง (นับจากวันนี้) — null ถ้ายังไม่ใส่วัน/ไปแล้ว */
  daysUntil: number | null;
};

const META_KEY = "nagame.tripMeta.v1";

// ── วันที่: ใช้ local date string กัน timezone เพี้ยน ──
// (ผู้ใช้อยู่ไทย/ญี่ปุ่น — ถ้าใช้ UTC วันจะเลื่อนตอนดึก)
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** ต่างกันกี่วัน (b - a) — คิดแบบวันปฏิทิน ไม่สนเวลา */
export function daysBetween(aISO: string, bISO: string): number {
  const a = new Date(`${aISO}T00:00:00`);
  const b = new Date(`${bISO}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function isValidISODate(s: string | undefined): s is string {
  if (!s) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  return !Number.isNaN(d.getTime());
}

// ── หัวใจ: derive status จากเหตุการณ์จริง ──
// pure function ทดสอบได้ ไม่แตะ storage — `today` ฉีดเข้ามาได้เพื่อเทส
export function deriveStatus(meta: TripMeta, today: string = todayISO()): TripStatus {
  const { startDate, endDate } = meta;

  // ยังไม่ใส่วัน = ฝันไว้ก่อน (ต่อให้กด "จองแล้ว" ก็ยังไม่รู้ว่าไปวันไหน)
  if (!isValidISODate(startDate)) return "dream";

  const end = isValidISODate(endDate) ? endDate : startDate; // ไม่ใส่วันกลับ = ไปวันเดียว

  // เลยวันกลับ = จบทริป (ชนะทุกเงื่อนไข — ไปมาแล้วก็คือไปมาแล้ว)
  if (daysBetween(end, today) > 0) return "done";
  // อยู่ในช่วงเดินทาง = กำลังไป
  if (daysBetween(startDate, today) >= 0) return "flying";
  // ยังไม่ถึงวัน: จองแล้วหรือยัง
  if (meta.bookedManually || typeof meta.bookedSignalAt === "number") return "booked";
  return "planning";
}

export const STATUS_LABEL: Record<TripStatus, string> = {
  dream: "ยังฝันอยู่",
  planning: "กำลังวางแผน",
  booked: "จองแล้ว",
  flying: "กำลังไป",
  done: "ไปมาแล้ว",
};

/** สีตราประทับตาม nagame-design — indigo=ข้อมูล, gold=highlight, matcha=ok/สำเร็จ */
export const STATUS_TONE: Record<TripStatus, "indigo" | "gold" | "matcha"> = {
  dream: "indigo",
  planning: "indigo",
  booked: "gold",
  flying: "gold",
  done: "matcha",
};

// ── storage (localStorage; sync ขึ้น server แยกใน trip.ts pattern เดิม) ──
type MetaStore = Record<string, TripMeta>;

function readMetaStore(): MetaStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as MetaStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMetaStore(store: MetaStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(store));
  } catch {
    // storage เต็ม/ปิด → ยอมให้หายรอบนี้ (ห้ามโยน error ใส่ผู้ใช้ — ตาม pattern trip.ts)
  }
}

export function getTripMeta(citySlug: string): TripMeta {
  return readMetaStore()[citySlug] ?? { citySlug };
}

/** อัปเดตเมตา (merge) — คืนค่าล่าสุด + push ขึ้น server แบบ best-effort */
export function setTripMeta(citySlug: string, patch: Partial<Omit<TripMeta, "citySlug">>): TripMeta {
  const store = readMetaStore();
  const next: TripMeta = { ...(store[citySlug] ?? { citySlug }), ...patch, citySlug };
  // ใส่วันกลับก่อนวันไป = สลับให้ (ผู้ใช้พิมพ์กลับด้าน ไม่ควรพัง)
  if (isValidISODate(next.startDate) && isValidISODate(next.endDate) && daysBetween(next.startDate, next.endDate) < 0) {
    [next.startDate, next.endDate] = [next.endDate, next.startDate];
  }
  store[citySlug] = next;
  writeMetaStore(store);
  void syncMetaToServer(next); // fire-and-forget (ถ้าไม่มี backend → เงียบ)
  return next;
}

// ── ชั้น sync กับ backend (Supabase ผ่าน /api/trip-meta) ──
// pattern เดียวกับ trip.ts: ถ้า backend ยังไม่ตั้ง (503) หรือ network fail → เงียบ,
// localStorage ยังทำงาน. ห้าม throw ใส่ผู้ใช้ (Trip เป็น delight layer).

export async function syncMetaToServer(meta: TripMeta): Promise<void> {
  if (typeof window === "undefined") return;
  const deviceId = getDeviceId();
  if (!deviceId) return;
  try {
    await fetch("/api/trip-meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId,
        citySlug: meta.citySlug,
        startDate: meta.startDate ?? null,
        endDate: meta.endDate ?? null,
        bookedManually: Boolean(meta.bookedManually),
      }),
      keepalive: true,
    });
  } catch {
    // ออฟไลน์/พัง → ข้าม localStorage ยังเป็น source ในเครื่อง
  }
}

/** ดึงเมตาจาก server แล้ว merge ลง localStorage — local ทับ (ผู้ใช้เพิ่งแก้ในเครื่องนี้) */
export async function loadMetaFromServer(): Promise<void> {
  if (typeof window === "undefined") return;
  const deviceId = getDeviceId();
  if (!deviceId) return;
  try {
    const res = await fetch(`/api/trip-meta?deviceId=${encodeURIComponent(deviceId)}`);
    if (!res.ok) return; // 503 not-configured / error → ใช้ local
    const data = (await res.json()) as { meta?: TripMeta[] };
    const remote = Array.isArray(data.meta) ? data.meta : [];
    if (remote.length === 0) return;
    const store = readMetaStore();
    for (const m of remote) {
      if (!m?.citySlug) continue;
      store[m.citySlug] = { ...m, ...store[m.citySlug], citySlug: m.citySlug };
    }
    writeMetaStore(store);
  } catch {
    // เงียบ — local ใช้ได้อยู่แล้ว
  }
}

/** ประกอบ Trip เต็มของเมืองหนึ่ง — items (จาก trip.ts) + meta + status ที่ derive แล้ว */
export function getTripForCityWithStatus(citySlug: string, cityName: string, today: string = todayISO()): Trip {
  const items = getTrip().filter((it) => it.citySlug === citySlug);
  const meta = getTripMeta(citySlug);
  const status = deriveStatus(meta, today);
  const daysUntil =
    isValidISODate(meta.startDate) && (status === "planning" || status === "booked")
      ? daysBetween(today, meta.startDate)
      : null;
  return { ...meta, cityName, items, status, daysUntil };
}
