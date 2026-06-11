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

// WMO weather code (Open-Meteo) → ภาษาไทยที่อ่านแล้วเห็นภาพทันที
export function weatherCodeToText(code?: number | null) {
  if (code == null) return "ยังไม่มีข้อมูล";
  if (code === 0) return "ฟ้าใส แดดดี";
  if ([1, 2].includes(code)) return "มีเมฆบ้าง ฟ้ายังเปิด";
  if (code === 3) return "เมฆครึ้มทั้งฟ้า";
  if ([45, 48].includes(code)) return "หมอกลง ทัศนวิสัยต่ำ";
  if ([51, 53, 55, 56, 57].includes(code)) return "ฝนปรอยเบา ๆ";
  if ([65, 67, 82].includes(code)) return "ฝนตกหนัก";
  if ([61, 63, 66, 80, 81].includes(code)) return "มีฝนเป็นช่วง ๆ";
  if ([75, 77, 86].includes(code)) return "หิมะตกหนัก";
  if ([71, 73, 85].includes(code)) return "หิมะกำลังตก";
  if ([95, 96, 99].includes(code)) return "ฝนฟ้าคะนอง";
  return "อากาศแปรปรวน";
}

// OpenWeather condition id → ชุดคำเดียวกับ weatherCodeToText
// เพื่อให้หน้าเว็บใช้ภาษาเดียวกันไม่ว่าข้อมูลมาจากผู้ให้บริการไหน
export function openWeatherIdToText(id?: number | null) {
  if (id == null) return null;
  if (id >= 200 && id < 300) return "ฝนฟ้าคะนอง";
  if (id >= 300 && id < 400) return "ฝนปรอยเบา ๆ";
  if (id === 511) return "ฝนเยือกแข็ง ระวังถนนลื่น";
  if ([502, 503, 504, 522, 531].includes(id)) return "ฝนตกหนัก";
  if (id >= 500 && id < 600) return "มีฝนเป็นช่วง ๆ";
  if ([611, 612, 613, 615, 616].includes(id)) return "ฝนปนหิมะ";
  if ([602, 622].includes(id)) return "หิมะตกหนัก";
  if (id >= 600 && id < 700) return "หิมะกำลังตก";
  if ([701, 721, 741].includes(id)) return "หมอกลง ทัศนวิสัยต่ำ";
  if (id === 771) return "ลมกระโชกแรง";
  if (id === 781) return "พายุรุนแรง";
  if (id >= 700 && id < 800) return "ฟ้ามัว มีฝุ่นหรือควันในอากาศ";
  if (id === 800) return "ฟ้าใส แดดดี";
  if ([801, 802].includes(id)) return "มีเมฆบ้าง ฟ้ายังเปิด";
  if (id === 803) return "เมฆค่อนข้างมาก";
  if (id === 804) return "เมฆครึ้มทั้งฟ้า";
  return "อากาศแปรปรวน";
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
