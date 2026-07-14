// manhole-spots — จุดวางฝาท่อ 5 ดวงบนแผนที่ ต่อเมือง (ก้าว J, ผูกตรา→หมุด).
// ตรา 5 ดวงใน journal (STAMP_KEYS) เป็น "กิจกรรมในแอป" ไม่มีพิกัดจริง → เราเลือก landmark
// ของแต่ละเมืองมาเป็น "ที่ตั้งฝาท่อ" เพื่อให้เกมมีที่ทางบนแผนที่ (เก็บแล้ว=สี, ยังไม่=ghost).
// ไม่เปลี่ยน schema journal — แค่ map StampKey → พิกัด+ชื่อจุด. ตาม [[nagame-v2-direction]].
//
// ยึด StampKey เดิม 5 ดวง: visit / chat / webcam / dayplan / recs. เมืองที่ไม่มีใน map นี้
// → ไม่แสดงหมุดฝาท่อ (แผนที่ยังมี POI ปกติ). เมืองแรก = โตเกียว.

import type { StampKey } from "@/lib/game/journal";
import type { LatLon } from "@/lib/cities/area-coords";

export type ManholeSpot = {
  key: StampKey;
  lat: number;
  lon: number;
  place: string; // ชื่อ landmark ที่วางฝาท่อ (กร๊วกอ้างอิงได้)
};

// จุดวางต่อเมือง (slug → 5 spot). พิกัดคือ landmark สื่อความหมายของแต่ละตรา
const SPOTS: Record<string, ManholeSpot[]> = {
  tokyo: [
    { key: "visit", lat: 35.6595, lon: 139.7005, place: "ชิบุยะ สแครมเบิล" },
    { key: "chat", lat: 35.7148, lon: 139.7967, place: "อาซากุสะ วัดเซนโซจิ" },
    { key: "webcam", lat: 35.6586, lon: 139.7454, place: "โตเกียวทาวเวอร์" },
    { key: "dayplan", lat: 35.6852, lon: 139.7528, place: "สวนอิมพีเรียล" },
    { key: "recs", lat: 35.7141, lon: 139.7774, place: "อุเอโนะ อาเมโยโกะ" },
  ],
  osaka: [
    { key: "visit", lat: 34.6687, lon: 135.5013, place: "โดทงโบริ" },
    { key: "chat", lat: 34.6873, lon: 135.5259, place: "ปราสาทโอซาก้า" },
    { key: "webcam", lat: 34.6547, lon: 135.5063, place: "ชินเซไก / สึเทนคาคุ" },
    { key: "dayplan", lat: 34.7025, lon: 135.4959, place: "อูเมดะ" },
    { key: "recs", lat: 34.6659, lon: 135.5006, place: "นัมบะ" },
  ],
  kyoto: [
    { key: "visit", lat: 34.9671, lon: 135.7727, place: "ฟูชิมิ อินาริ" },
    { key: "chat", lat: 35.0394, lon: 135.7292, place: "คินคะคุจิ" },
    { key: "webcam", lat: 34.985, lon: 135.6673, place: "อาราชิยามะ" },
    { key: "dayplan", lat: 35.0037, lon: 135.7788, place: "ฮิงาชิยามะ / คิโยมิซุ" },
    { key: "recs", lat: 35.0116, lon: 135.7681, place: "ใจกลางเกียวโต" },
  ],
};

export function getManholeSpots(citySlug: string): ManholeSpot[] {
  return SPOTS[citySlug] ?? [];
}

export function hasManholeSpots(citySlug: string): boolean {
  return citySlug in SPOTS;
}

export type { LatLon };
