// ChatReply — contract กลางของคำตอบกร๊วก. หัวใจของ Phase 0 (docs/chat-cards-roadmap.md).
//
// หลักการที่ห้ามหลุด: **โค้ดประกอบ card จากข้อมูลจริง — LLM แค่พูดไทย (bubbles)**.
// LLM ไม่มีสิทธิ์ emit card เอง → ไม่มี hallucination (ราคา/ชื่อร้านปลอม) เข้า UI ได้เลย,
// และ fail-silent เป็นธรรมชาติ: ของนอกพัง → ไม่มี card ใบนั้น ข้อความยังตอบได้.
//
// card ทุกใบที่มีปุ่มออกนอกแอปต้องใช้ buildOutbound() (lib/outbound.ts) เป็น href
// เพื่อนับ click-out + เสียบ affiliate จุดเดียวทีหลัง.

export type CardKind = "stay" | "eat" | "flight" | "webcam" | "weather" | "place";

type CardBase = {
  id: string;
  kind: CardKind;
};

// ── ที่พัก (Rakuten/Agoda ผ่าน outbound) ──
export type StayCard = CardBase & {
  kind: "stay";
  title: string;
  area?: string;
  /** ราคา/คืน เป็นบาท (number) — null ถ้าดึงไม่ได้ (ยังโชว์การ์ดได้ แค่ไม่มีราคา) */
  pricePerNightThb: number | null;
  rating?: number | null;
  imageUrl?: string | null;
  /** href ผ่าน buildOutbound แล้ว */
  bookUrl: string;
  note?: string;
};

// ── ร้านอาหาร (Google Places ผ่าน outbound) ──
export type EatCard = CardBase & {
  kind: "eat";
  title: string;
  area?: string;
  cuisine?: string;
  rating?: number | null;
  priceLevel?: string | null; // "฿" | "฿฿" | ...
  imageUrl?: string | null;
  mapUrl: string; // href ผ่าน buildOutbound
  note?: string;
};

// ── ตั๋วบิน (fli ผ่าน outbound; optional enrichment) ──
export type FlightCard = CardBase & {
  kind: "flight";
  route: string; // "BKK → NRT"
  priceThb: number | null;
  airline?: string;
  period?: string; // "ธ.ค." หรือช่วงวันที่ถาม
  searchUrl: string; // href ผ่าน buildOutbound (Google Flights fallback)
  note?: string;
};

// ── กล้องสด (จาก webcam service ที่มีอยู่) ──
export type WebcamCard = CardBase & {
  kind: "webcam";
  title: string;
  /** ภาพนิ่งกึ่งสด — กำกับใน UI ว่า "สดเมื่อสักครู่" ไม่ใช่วินาทีนี้ */
  previewImage: string;
  liveUrl: string; // href ผ่าน buildOutbound (webcam)
  source?: string;
};

// ── อากาศ/ฤดู (จาก weather + seasons; ตอบ "ช่วงนั้นเป็นไง") ──
export type WeatherCard = CardBase & {
  kind: "weather";
  cityName: string;
  headline: string; // "ธ.ค. โตเกียว 6–13°C แห้ง ฟ้าใส"
  tempRange?: string;
  rainChance?: number | null;
  season?: string; // ชื่อฤดู/ไฮไลต์ถ้ามี
  note?: string;
};

// ── สถานที่ทั่วไป (recommendation ที่ไม่เข้าหมวดข้างบน) ──
export type PlaceCard = CardBase & {
  kind: "place";
  title: string;
  area?: string;
  emoji?: string;
  imageUrl?: string | null;
  mapUrl?: string; // href ผ่าน buildOutbound (nav) ถ้ามีพิกัด
  note?: string;
};

export type Card = StayCard | EatCard | FlightCard | WebcamCard | WeatherCard | PlaceCard;

// คำสั่งไปเวที (แผนที่/ทริป) — chat เป็น router. Phase 0 ยังไม่ใช้เต็ม แต่วาง contract ไว้
// ให้ Phase 1-2 (แผนที่ focus area) เสียบได้โดยไม่แก้ ChatReply.
export type StageCommand = {
  focusArea?: string;
  focusCitySlug?: string;
  layer?: "stay" | "eat";
};

// คำตอบกร๊วกหนึ่งครั้ง: หลาย speech bubble + การ์ดข้อมูลจริง + (อาจ) สั่งเวที.
export type ChatReply = {
  /** ข้อความกร๊วก แตกเป็นหลายฟอง (formalize จากสัญญาใจ \n\n เดิม) */
  bubbles: string[];
  cards: Card[];
  stageCommand?: StageCommand;
  /** ที่มาของคำตอบ — ไว้ debug/แสดง (AI vs rule-based) */
  source?: "AI advisor" | "Rule-based advisor";
};

// helper: แตกข้อความก้อนเดียว (จาก LLM/rule) เป็น bubbles ตาม \n\n — จุดเดียวที่ทำ
// (เลิกให้ client split เอง). ตัดว่างทิ้ง, กันฟองว่าง.
export function toBubbles(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
}
