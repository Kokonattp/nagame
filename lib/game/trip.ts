// ทริปของกร๊วก — ที่ที่คุยกับกร๊วกแล้วอยากไป มากองรวมกันที่นี่ (client-only, localStorage).
// ตาม [[nagame-v2-direction]]: Trip tab = "สิ่งที่คุยกับกร๊วกจะมากองที่นี่". ยังไม่มี backend
// → เก็บ localStorage ก่อน แต่ schema เก็บ timestamp + citySlug ให้ เผื่อวันหน้ามี account
// จะ sync/merge ได้โดยไม่เปลี่ยน schema (เหมือน journal.ts). ตรง [[nagame-architecture-decisions]].

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
  if (isInTrip(item.id)) return { items: removeFromTrip(item.id), added: false };
  return { items: addToTrip(item), added: true };
}
