export function slugifyCity(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toTitleCase(value: string) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function formatThaiDate(date = new Date()) {
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Tokyo",
  }).format(date);
}

export function formatTime(date = new Date()) {
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(date);
}

export function round(value: number | null | undefined, digits = 0) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function weatherCodeToText(code?: number | null) {
  if (code == null) return "ยังไม่มีข้อมูล";
  if (code === 0) return "ท้องฟ้าโปร่ง";
  if ([1, 2].includes(code)) return "มีเมฆบางส่วน";
  if (code === 3) return "เมฆมาก";
  if ([45, 48].includes(code)) return "มีหมอก";
  if ([51, 53, 55, 56, 57].includes(code)) return "ฝนปรอย";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "มีฝน";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "หิมะ";
  if ([95, 96, 99].includes(code)) return "พายุฝน";
  return "สภาพอากาศเปลี่ยนแปลง";
}

export function aqiLabel(value?: number | null) {
  if (value == null) return "ไม่พร้อม";
  if (value <= 50) return "ดี";
  if (value <= 100) return "ปานกลาง";
  if (value <= 150) return "เริ่มมีผล";
  if (value <= 200) return "ไม่ดี";
  if (value <= 300) return "แย่มาก";
  return "อันตราย";
}

export function crowdLabel(score?: number | null) {
  if (score == null) return "ไม่มีข้อมูล";
  if (score <= 35) return "ค่อนข้างสบาย";
  if (score <= 65) return "ปานกลาง";
  return "น่าจะคึกคัก";
}
