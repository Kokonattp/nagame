export type HolidayWindow = {
  name: string;
  // MM-DD ช่วง from > to หมายถึงคร่อมปีใหม่
  from: string;
  to: string;
  note: string;
};

// ช่วงที่คนญี่ปุ่นเที่ยวพร้อมกันทั้งประเทศ — ที่พักแพง รถไฟ/ที่จอดเต็ม
export const japanHolidayWindows: HolidayWindow[] = [
  {
    name: "Golden Week",
    from: "04-29",
    to: "05-06",
    note: "วันหยุดยาวใหญ่สุดของปี ที่พักและรถไฟควรจองล่วงหน้าหลายสัปดาห์ จุดดังอย่าง Shirakawa-go เต็มโควตารถตั้งแต่เช้า",
  },
  {
    name: "Obon",
    from: "08-11",
    to: "08-16",
    note: "คนญี่ปุ่นกลับบ้าน/เที่ยวพร้อมกัน ทางด่วนติดหนัก Shinkansen เต็มทุกขบวนช่วงเช้า",
  },
  {
    name: "ปีใหม่ญี่ปุ่น",
    from: "12-28",
    to: "01-04",
    note: "ร้านและพิพิธภัณฑ์จำนวนมากปิด 31 ธ.ค.-3 ม.ค. แต่ศาลเจ้าคึกคักสุดของปี (hatsumode)",
  },
];

export type SeasonStatus =
  | { state: "active" }
  | { state: "upcoming"; daysUntil: number }
  | { state: "idle" };

// เทียบช่วง MM-DD กับเวลาปัจจุบันแบบ JST รองรับช่วงคร่อมปีใหม่
export function windowStatus(from: string, to: string, now = new Date()): SeasonStatus {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = jst.getUTCFullYear();
  const today = Date.UTC(year, jst.getUTCMonth(), jst.getUTCDate());

  const parse = (value: string, yearOffset = 0) => {
    const [month, day] = value.split("-").map(Number);
    return Date.UTC(year + yearOffset, month - 1, day);
  };

  const wraps = from > to;
  const start = parse(from);
  const end = wraps ? parse(to, 1) : parse(to);
  const startPrev = wraps ? parse(from, -1) : null;
  const endPrev = wraps ? parse(to) : null;

  if ((today >= start && today <= end) || (startPrev !== null && endPrev !== null && today >= startPrev && today <= endPrev)) {
    return { state: "active" };
  }

  const nextStart = today <= start ? start : parse(from, 1);
  const daysUntil = Math.round((nextStart - today) / (24 * 60 * 60 * 1000));
  if (daysUntil <= 45) {
    return { state: "upcoming", daysUntil };
  }

  return { state: "idle" };
}

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export function formatMonthDay(value: string) {
  const [month, day] = value.split("-").map(Number);
  return `${day} ${THAI_MONTHS[month - 1] ?? ""}`;
}
