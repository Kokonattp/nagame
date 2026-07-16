// outbound — ท่อกลางของทุกลิงก์ที่ออกนอกแอป (จอง/ดูตั๋ว/เปิดต้นทาง/นำทาง).
// เหตุผลเชิงธุรกิจ: platform นี้ไม่รับเงิน — conversion ทั้งหมดออกทาง deep-link.
// ทุกคลิกออกต้องผ่านที่นี่เพื่อ (1) นับ click-out เป็นตัววัดรายได้ล่วงหน้าตั้งแต่วันแรก
// (2) วันหน้าเสียบ affiliate id ที่จุดเดียว ไม่ต้องไล่แก้ทุก <a>. ตาม docs/chat-cards-roadmap.md.
//
// dual-mode เหมือน [[nagame-persistence-architecture]]: ไม่มี Supabase key → redirect เฉย ๆ
// ไม่พัง. มี key → log ก่อน redirect. ห้ามให้ logging บล็อกการ redirect ของผู้ใช้.

export type OutboundKind =
  | "stay" // จองที่พัก (Rakuten/Agoda)
  | "eat" // ร้านอาหาร (Google Places/Tabelog)
  | "flight" // ตั๋วบิน (fli/Google Flights)
  | "nav" // นำทาง (Google Maps)
  | "webcam" // เปิดกล้องต้นทาง
  | "place" // สถานที่ทั่วไป
  | "other";

export type OutboundMeta = {
  kind: OutboundKind;
  /** ป้ายสั้น ๆ ไว้ดูใน analytics ว่าคลิกอะไร เช่น "อาซากุสะ ฿1,650" */
  label?: string;
  citySlug?: string;
};

// สร้าง URL ที่ชี้กลับมาที่ /api/outbound ก่อนเด้งออก — client ใช้เป็น href ของปุ่ม/ลิงก์.
// เข้ารหัสปลายทางใน query (`to`) + meta เพื่อ log ฝั่ง server แล้วค่อย 302 ออกไป target จริง.
export function buildOutbound(target: string, meta: OutboundMeta): string {
  // กันของแปลก: อนุญาตเฉพาะ http/https ปลายทาง (ไม่ให้ยัด javascript:/data: มา redirect)
  if (!/^https?:\/\//i.test(target)) return target;

  const sp = new URLSearchParams();
  sp.set("to", target);
  sp.set("kind", meta.kind);
  if (meta.label) sp.set("label", meta.label.slice(0, 120));
  if (meta.citySlug) sp.set("city", meta.citySlug);
  return `/api/outbound?${sp.toString()}`;
}

// ตรวจว่า target ปลอดภัยจะ redirect ไป — ใช้ทั้งฝั่ง route.
// อนุญาตเฉพาะ absolute http/https; กัน open-redirect ไป scheme อันตราย.
export function isSafeOutboundTarget(target: string): boolean {
  try {
    const u = new URL(target);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
