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

-- ── เมตาทริปต่อเมือง: วันเดินทาง + สัญญาณจอง (Phase 2 Trip lifecycle) ──
-- status ไม่เก็บ — derive จากวัน+สัญญาณจองเสมอ (lib/game/trip-lifecycle.ts) เพราะ
-- status เป็นฟังก์ชันของ "วันนี้" ถ้าเก็บไว้จะ stale ทันทีที่วันเปลี่ยน (planning→flying
-- ต้องขยับเองโดยไม่มีใครกดปุ่ม). เก็บแต่ fact ที่ปลอมไม่ได้ แล้วคำนวณตอนอ่าน.
create table if not exists trip_meta (
  device_id       text not null,
  city_slug       text not null,
  start_date      text,           -- ISO "YYYY-MM-DD" (null = ยังไม่ใส่วัน = dream)
  end_date        text,
  booked_manually boolean not null default false,
  booked_signal_at bigint,        -- epoch ms ของ clickout kind=stay|flight ล่าสุด (ปลอมไม่ได้)
  updated_at      bigint not null,
  primary key (device_id, city_slug)
);

create index if not exists trip_meta_device_idx on trip_meta (device_id);

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

-- ── Tabi funnel events (POST /api/tabi/event) — anonymous: random per-browser id, no IP/name/text ──
-- SQL สำหรับวิเคราะห์ funnel / retention อยู่ที่ docs/analytics/tabi-funnel.md
create table if not exists tabi_events (
  id         bigint generated always as identity primary key,
  session_id text not null,                 -- random UUID ต่อเบราว์เซอร์ (localStorage)
  event      text not null,                 -- home_view | ask | routes_shown | … (lib/tabi/track.ts)
  props      jsonb not null default '{}',   -- month, days, stops, source, ref …
  path       text,
  ts         timestamptz not null default now()
);

create index if not exists tabi_events_event_ts_idx on tabi_events (event, ts);
create index if not exists tabi_events_session_idx on tabi_events (session_id, ts);

-- ── Tabi trips of signed-in users (GET/PUT/DELETE /api/tabi/trips) ──
-- user_id = "line:<id>" / "google:<id>" from the session (no email). Access only through the server
-- (service key); the browser never talks to this table. Delete = profile → "ลบข้อมูลทั้งหมด".
create table if not exists tabi_trips (
  user_id    text not null,
  trip_id    text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, trip_id)
);

create index if not exists tabi_trips_user_idx on tabi_trips (user_id, updated_at desc);

-- When a user pressed "ลบข้อมูลทั้งหมด": other devices drop copies older than this instead of re-uploading
create table if not exists tabi_account_resets (
  user_id  text primary key,
  reset_at timestamptz not null
);

-- Row Level Security ON with no policies: only the server (service key) can read or write.
-- Supabase exposes public tables to the anon key, which is public by design — this closes that.
alter table tabi_trips enable row level security;
alter table tabi_account_resets enable row level security;
alter table tabi_events enable row level security;

-- ── แจ้งเตือนแผ่นดินไหว/สึนามิภาษาไทย (Web Push) — docs/quake-alerts.md ──
-- เขียนผ่าน /api/tabi/push (service key), อ่าน/ลบโดย workers/quake-alert. ไม่มีชื่อ/บัญชี/ตำแหน่ง:
-- แค่ปลายทาง push ของเบราว์เซอร์ + จังหวัดในทริป + ช่วงวันเดินทาง. หนึ่งเครื่องตามได้หลายทริป.
create table if not exists push_subscriptions (
  endpoint    text not null,               -- URL ของ push service (FCM / Apple / Mozilla / Windows)
  trip_id     text not null,               -- id ทริปในเบราว์เซอร์ (lib/tabi/store.ts)
  p256dh      text not null,               -- กุญแจเข้ารหัสของเบราว์เซอร์
  auth        text not null,
  prefectures text[] not null,             -- ชื่อจังหวัดภาษาอังกฤษ เช่น {Tokyo,Kyoto}
  starts_on   date not null,               -- วันแรกของทริป (เวลาญี่ปุ่น)
  ends_on     date not null,               -- วันสุดท้าย; worker ลบแถวที่จบเกิน 7 วัน
  updated_at  timestamptz not null default now(),
  primary key (endpoint, trip_id)
);

create index if not exists push_subscriptions_window_idx on push_subscriptions (starts_on, ends_on);
-- ไม่มี policy = anon/publishable key อ่านไม่ได้; service key (API route + worker) ข้าม RLS อยู่แล้ว
alter table push_subscriptions enable row level security;
