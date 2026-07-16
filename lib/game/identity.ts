// identity — "ใครเป็นเจ้าของข้อมูล" ชั้นแรกแบบ anonymous (client-only).
// ตาม [[nagame-redesign-direction]]: เจ้าของยังไม่ไป LINE OA → ใช้ device id (UUID ใน
// localStorage) เป็น identity ก่อน. พอมี LINE login วันหน้าค่อย merge device id → line user id
// (ตอนนั้นเก็บ mapping ฝั่ง server). ตอนนี้: device id พอให้ Trip/ตรา sync ข้ามแท็บ/รีเฟรชได้.
//
// ข้อจำกัดที่ยอมรับ (ชั้น anonymous): เคลียร์ storage/เปลี่ยนเครื่อง = ได้ id ใหม่ ข้อมูลไม่ตาม
// ไป — LINE login จะแก้เรื่องนี้ทีหลัง. ตอนนี้ดีกว่า localStorage ล้วนตรงที่ข้อมูลอยู่ server แล้ว.

const KEY = "nagame.deviceId.v1";

export function getDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(KEY, id);
    }
    // มิเรอร์ลง cookie ด้วย เพื่อให้ /api/outbound (server) อ่าน deviceId ได้ตอนคลิกออกนอกแอป
    // → click-out attribution ต่อ device ทำงาน (localStorage server อ่านไม่ได้). SameSite=Lax
    // พอสำหรับ same-site redirect, 1 ปี, ไม่ใช่ HttpOnly เพราะต้องเขียนจาก client.
    document.cookie = `nagame_did=${id}; path=/; max-age=31536000; SameSite=Lax`;
    return id;
  } catch {
    // storage ปิด (private mode) → ไม่มี id คงที่ได้ → คืน null, ชั้นบนจะ fallback localStorage-only
    return null;
  }
}
