import type { KruakArtKey } from "@/lib/game/kruak";

// อารมณ์ของกร๊วก (NPC) — เป็น pure function ของสัญญาณที่หน้าเพจ "ดึงมาแล้ว" เท่านั้น
// (อากาศ/AQI/ประกาศเตือน) จึงไม่มี fetch ใหม่ ไม่มี backend. ทำให้ NPC รู้สึก "มีชีวิตจาก
// ข้อมูลจริง" ไม่ใช่สุ่มปลอม ๆ. ลำดับความสำคัญ: ความปลอดภัย > สภาพเที่ยว.

export type Mood = {
  art: KruakArtKey;
  // ป้ายชื่ออารมณ์สั้น ๆ ใต้ชื่อ "กร๊วก" (RPG nameplate) — undefined = ไม่ต้องขึ้นบรรทัดอารมณ์
  tone?: string;
};

type MoodInput = {
  hasSevereWarning: boolean;
  rainChance: number | null | undefined;
  aqi: number | null | undefined;
};

export function getKruakMood({ hasSevereWarning, rainChance, aqi }: MoodInput): Mood {
  if (hasSevereWarning) return { art: "worried", tone: "กร๊วกเป็นห่วง…" };
  if (typeof aqi === "number" && aqi > 100) return { art: "dust", tone: "ฝุ่นเยอะ พกหน้ากากนะ" };
  if (typeof rainChance === "number" && rainChance >= 60) return { art: "rain", tone: "กร๊วกว่าพกร่มนะ" };
  if (typeof rainChance === "number" && rainChance <= 15) return { art: "sunny", tone: "วันนี้กร๊วกอารมณ์ดี" };
  return { art: "idle", tone: undefined };
}
