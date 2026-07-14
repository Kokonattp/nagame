// 御朱印帳 — สมุดตราประทับของกร๊วก (client-only, localStorage เท่านั้น, ยังไม่มี backend)
// ทุกเมือง = หนึ่งหน้าสมุด. เก็บตราจาก "การใช้งานจริงในแอป" (ไม่ใช่ GPS check-in — เราไม่มี
// location tracking) จึงซื่อสัตย์: มันบันทึกว่า "แป๊ะพาดูอะไรบ้าง" ไม่ใช่ "ไปยืนตรงไหนมา".
// รูปแบบ v1 เก็บ timestamp ที่ได้แต่ละตรา → เผื่อวันหน้ามี account จะ sync/merge ได้โดยไม่ต้อง
// เปลี่ยน schema (ดู [[nagame-architecture-decisions]]).

export const STAMP_KEYS = ["visit", "chat", "webcam", "dayplan", "recs"] as const;
export type StampKey = (typeof STAMP_KEYS)[number];

export type CityStamps = Partial<Record<StampKey, number>>;

// เมตาของแต่ละตรา — ใช้ทั้งใน pill และ modal สมุด
export const STAMP_META: Record<StampKey, { emoji: string; label: string; hint: string }> = {
  visit: { emoji: "⛩", label: "เยือนเมือง", hint: "เปิดหน้าเมืองนี้" },
  chat: { emoji: "💬", label: "คุยกับกร๊วก", hint: "ทักกร๊วกสักคำ" },
  webcam: { emoji: "📷", label: "ชะโงกดูเมือง", hint: "เปิดกล้องสดดู" },
  dayplan: { emoji: "🗓", label: "ดูแผนวันนี้", hint: "เลื่อนไปดูแผนที่กร๊วกจัดให้" },
  recs: { emoji: "🍜", label: "รับของฝาก", hint: "กดดูของฝากทั้งหมด" },
};

export const STAMPS_PER_CITY = STAMP_KEYS.length;

const STORAGE_KEY = "nagame.journal.v1";

type JournalData = {
  stamps: Record<string, CityStamps>;
};

function readJournal(): JournalData {
  if (typeof window === "undefined") return { stamps: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { stamps: {} };
    const parsed = JSON.parse(raw) as Partial<JournalData>;
    return { stamps: parsed.stamps ?? {} };
  } catch {
    // storage ปิด/เต็ม/ข้อมูลเพี้ยน → เริ่มใหม่แบบเงียบ ๆ (เกมเป็น delight layer ห้ามพังหน้า)
    return { stamps: {} };
  }
}

function writeJournal(data: JournalData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // เขียนไม่ได้ (private mode ฯลฯ) → ยอมให้ตราหายรอบนี้ ดีกว่าโยน error ใส่ผู้ใช้
  }
}

export function getCityStamps(citySlug: string): CityStamps {
  return readJournal().stamps[citySlug] ?? {};
}

export function countStamps(stamps: CityStamps): number {
  return STAMP_KEYS.reduce((total, key) => (stamps[key] ? total + 1 : total), 0);
}

// ประทับตรา (idempotent — ประทับซ้ำไม่เพิ่ม, คืน true เฉพาะครั้งที่ได้ใหม่จริง เพื่อจุด animation)
export function earnStamp(citySlug: string, key: StampKey): { earned: boolean; stamps: CityStamps } {
  const data = readJournal();
  const city = data.stamps[citySlug] ?? {};
  if (city[key]) return { earned: false, stamps: city };
  const next = { ...city, [key]: Date.now() };
  data.stamps[citySlug] = next;
  writeJournal(data);
  return { earned: true, stamps: next };
}
