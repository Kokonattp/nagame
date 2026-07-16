// ทริปของกร๊วก — ที่ที่คุยกับกร๊วกแล้วอยากไป มากองรวมกันที่นี่ (client-only, localStorage).
// ตาม [[nagame-v2-direction]]: Trip tab = "สิ่งที่คุยกับกร๊วกจะมากองที่นี่". ยังไม่มี backend
// → เก็บ localStorage ก่อน แต่ schema เก็บ timestamp + citySlug ให้ เผื่อวันหน้ามี account
// จะ sync/merge ได้โดยไม่เปลี่ยน schema. ตรง [[nagame-architecture-decisions]].

import { getDeviceId } from "@/lib/game/identity";

export type TripItem = {
  id: string; // = `${kind}-${title}` (กันซ้ำ, idempotent)
  citySlug: string;
  cityName: string;
  title: string;
  area: string;
  kind: string; // see | eat | sleep | shop | do
  emoji: string;
  addedAt: number;
};

const STORAGE_KEY = "nagame.trip.v1";

type TripData = { items: TripItem[] };

function readTrip(): TripData {
  if (typeof window === "undefined") return { items: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw) as Partial<TripData>;
    return { items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return { items: [] };
  }
}

function writeTrip(data: TripData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage ปิด/เต็ม → ยอมให้หายรอบนี้ ดีกว่าโยน error ใส่ผู้ใช้ (delight layer ห้ามพังหน้า)
  }
}

export function getTrip(): TripItem[] {
  return readTrip().items;
}

export function getTripForCity(citySlug: string): TripItem[] {
  return readTrip().items.filter((it) => it.citySlug === citySlug);
}

export function isInTrip(id: string): boolean {
  return readTrip().items.some((it) => it.id === id);
}

// เพิ่มลงทริป (idempotent — มีแล้วไม่เพิ่มซ้ำ). คืน items ล่าสุดเสมอ
export function addToTrip(item: Omit<TripItem, "addedAt">): TripItem[] {
  const data = readTrip();
  if (data.items.some((it) => it.id === item.id)) return data.items;
  data.items = [...data.items, { ...item, addedAt: Date.now() }];
  writeTrip(data);
  return data.items;
}

export function removeFromTrip(id: string): TripItem[] {
  const data = readTrip();
  data.items = data.items.filter((it) => it.id !== id);
  writeTrip(data);
  return data.items;
}

// toggle — คืน { items, added } เพื่อให้ UI รู้ว่าเพิ่งเพิ่มหรือลบ (สำหรับ animation/feedback)
export function toggleTrip(item: Omit<TripItem, "addedAt">): { items: TripItem[]; added: boolean } {
  const result = isInTrip(item.id)
    ? { items: removeFromTrip(item.id), added: false }
    : { items: addToTrip(item), added: true };
  void syncTripToServer(result.items); // best-effort push ขึ้น Supabase (ถ้า config ไว้)
  return result;
}

// ── ชั้น sync กับ backend (Supabase ผ่าน /api/trip) ──
// เป็น layer เสริม: ถ้า backend ยังไม่ตั้ง (503) หรือ network fail → เงียบ, localStorage ยังทำงาน
// (Trip เป็น delight layer ห้ามพังหน้า/บล็อก UI). ดู [[nagame-redesign-direction]].

// push ทริปทั้งชุดขึ้น server (fire-and-forget, ไม่ throw)
export async function syncTripToServer(items?: TripItem[]): Promise<void> {
  if (typeof window === "undefined") return;
  const deviceId = getDeviceId();
  if (!deviceId) return;
  const payload = items ?? getTrip();
  try {
    await fetch("/api/trip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, items: payload }),
      keepalive: true,
    });
  } catch {
    // network/ออฟไลน์ → ข้าม, localStorage ยังเป็น source ในเครื่อง
  }
}

// ดึงทริปจาก server แล้ว merge เข้า localStorage (union ตาม id, server + local).
// เรียกตอนเปิดแอป: ถ้าย้ายเครื่อง/ล้าง cache แต่ deviceId เดิม → ได้ทริปกลับ. คืน items หลัง merge.
export async function loadTripFromServer(): Promise<TripItem[]> {
  if (typeof window === "undefined") return getTrip();
  const deviceId = getDeviceId();
  if (!deviceId) return getTrip();
  try {
    const res = await fetch(`/api/trip?deviceId=${encodeURIComponent(deviceId)}`);
    if (!res.ok) return getTrip(); // 503 not-configured / error → ใช้ local
    const data = (await res.json()) as { items?: TripItem[] };
    const remote = Array.isArray(data.items) ? data.items : [];
    const local = getTrip();
    const byId = new Map<string, TripItem>();
    for (const it of remote) byId.set(it.id, it);
    for (const it of local) byId.set(it.id, it); // local ทับ (ผู้ใช้เพิ่งแก้ในเครื่องนี้)
    const merged = [...byId.values()].sort((a, b) => a.addedAt - b.addedAt);
    writeTrip({ items: merged });
    return merged;
  } catch {
    return getTrip();
  }
}
