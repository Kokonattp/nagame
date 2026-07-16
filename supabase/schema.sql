-- nagame — Supabase schema (รันใน Supabase SQL editor ครั้งเดียวตอนตั้ง project)
-- ตาม [[nagame-redesign-direction]]: backend persistence สำหรับ Trip/ตรา/ความจำกร๊วก.
-- identity ชั้นแรก = anonymous device_id (localStorage UUID). วันหน้ามี LINE login ค่อยเพิ่ม
-- ตาราง mapping device_id → line_user_id แล้ว merge (ไม่ต้องแก้ตารางนี้).

-- ── ทริป: ที่ที่ผู้ใช้บันทึกไว้อยากไป ──
create table if not exists trips (
  device_id text not null,
  item_id   text not null,   -- = `${kind}-${title}` จาก client
  city_slug text not null,
  city_name text not null,
  title     text not null,
  area      text not null,
  kind      text not null,   -- see | eat | sleep | shop | do
  emoji     text not null,
  added_at  bigint not null, -- epoch ms จาก client
  primary key (device_id, item_id)
);

create index if not exists trips_device_idx on trips (device_id);

-- หมายเหตุ RLS: เราเข้าผ่าน service key ฝั่ง server (API route) เท่านั้น ไม่เปิด anon key ให้ client
-- แตะตารางตรง จึงไม่ต้องพึ่ง RLS policy. ถ้าวันหน้าจะให้ client แตะตรง ต้องเปิด RLS + policy
-- ที่กรอง device_id/line_user_id ให้ถูกก่อน.

-- ── click-out: ทุกลิงก์ที่ผู้ใช้กดออกนอกแอป (จอง/ตั๋ว/นำทาง) ──
-- platform ไม่รับเงิน → conversion ออกทาง deep-link. นับ click-out = ตัววัดรายได้ล่วงหน้า
-- ตั้งแต่วันแรก + วันหน้าเสียบ affiliate id ที่จุดเดียว. เขียนผ่าน /api/outbound (service key).
create table if not exists clickouts (
  id        bigint generated always as identity primary key,
  device_id text,               -- anonymous device id (อาจ null ถ้า client ไม่ส่ง)
  kind      text not null,       -- stay | eat | flight | nav | webcam | place | other
  url       text not null,       -- ปลายทางที่กดออก
  label     text,                -- ป้ายที่คลิก เช่น "อาซากุสะ ฿1,650"
  city_slug text,
  ts        bigint not null      -- epoch ms
);

create index if not exists clickouts_kind_idx on clickouts (kind);
create index if not exists clickouts_ts_idx on clickouts (ts);

-- ── (เผื่ออนาคต) ตรา 御朱印帳 — ยังใช้ localStorage อยู่ ตารางนี้เตรียมไว้ตอน migrate ──
-- create table if not exists stamps (
--   device_id text not null,
--   city_slug text not null,
--   stamp_key text not null,
--   earned_at bigint not null,
--   primary key (device_id, city_slug, stamp_key)
-- );
