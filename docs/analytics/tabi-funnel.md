# Tabi funnel analytics

> สำหรับ: เจ้าของ (ตั้งระบบ + ฝึก SQL funnel/retention ไปพร้อมกัน)
> ข้อมูลไม่ระบุตัวตน: เก็บแค่ id สุ่มต่อเบราว์เซอร์ ชื่อ event และค่าเล็ก ๆ (เดือน, จำนวนวัน)
> ไม่เก็บ IP, ชื่อ, อีเมล หรือข้อความที่พิมพ์

## 1. เปิดใช้ (ทำครั้งเดียว ~10 นาที)
1. สมัคร/เข้า https://supabase.com แล้วสร้าง project ใหม่ (Free plan, region Singapore)
2. เมนู **SQL Editor** → วางทั้งไฟล์ `supabase/schema.sql` → Run
3. เมนู **Project Settings → API** คัดลอก `Project URL` และ `service_role` key
4. ใส่ใน Vercel (ห้ามส่ง key ในแชท):
   ```powershell
   cd D:\TT\nagame
   vercel env add SUPABASE_URL production
   vercel env add SUPABASE_SERVICE_KEY production
   vercel redeploy nagame.vercel.app
   ```
5. เปิดเว็บ กดอะไรสักหน่อย แล้วใน SQL Editor รัน `select * from tabi_events order by ts desc limit 20;` ต้องเห็นแถวใหม่

ก่อนตั้งค่า: เว็บส่ง event ได้ปกติ แต่ server ทิ้งไป ไม่มีอะไรพัง

## 2. Event ที่เก็บ
| event | เกิดเมื่อ | props |
|---|---|---|
| `home_view` | เปิดหน้าแรก | `source` = direct / month_page / ค่าจาก `?src=` |
| `ask` | ส่งข้อความหาทาบิ | `first` = ข้อความแรกของรอบนี้ไหม |
| `routes_shown` | ทาบิเสนอเส้นทาง | `refine`, `month`, `days` |
| `route_opened` | กดดูเส้นทาง | `route`, `stops` |
| `stop_added` | กด "ใส่ในทริป" | |
| `itinerary_drafted` | ได้แผนรายวัน | `days`, `stops` |
| `date_set` | ตั้งวันออกเดินทาง | `month` |
| `flights_opened` | เปิดหน้าตั๋ว | |
| `flight_clicked` | กดไป Google Flights | `method` = outbound / return |
| `leg_map_clicked` | กด "ดูทาง" (Google Maps) | |
| `trip_shared` | แชร์ทริป | `method` = image / link / copy, `ref` |
| `shared_trip_opened` | เพื่อนเปิดลิงก์แชร์ | `ref` (ตรงกับของคนแชร์) |
| `shared_trip_saved` | เพื่อนกดเก็บทริป | `ref` |
| `tour_done` / `tour_skipped` | ดูวิธีใช้จบ / กดข้าม | `step` |

`session_id` = เบราว์เซอร์หนึ่งเครื่อง (อยู่ได้หลายวัน จึงใช้ดู retention ได้)

## 3. Funnel หลัก
คำถาม: จากคนที่เข้ามา มีกี่ % ไปถึงแต่ละขั้น
```sql
with s as (
  select session_id,
    bool_or(event = 'home_view')         as visited,
    bool_or(event = 'ask')               as asked,
    bool_or(event = 'routes_shown')      as got_routes,
    bool_or(event = 'route_opened')      as opened_route,
    bool_or(event = 'itinerary_drafted') as drafted,
    bool_or(event = 'flight_clicked')    as clicked_flight
  from tabi_events
  where ts >= now() - interval '30 days'
  group by session_id
)
select
  count(*) filter (where visited)        as visited,
  count(*) filter (where asked)          as asked,
  count(*) filter (where got_routes)     as got_routes,
  count(*) filter (where opened_route)   as opened_route,
  count(*) filter (where drafted)        as drafted,
  count(*) filter (where clicked_flight) as clicked_flight,
  round(100.0 * count(*) filter (where drafted) / nullif(count(*) filter (where visited), 0), 1) as visit_to_plan_pct
from s;
```
อ่านผล: ขั้นไหนตกมากสุด = ขั้นที่ต้องแก้ก่อน

<details><summary>โจทย์ฝึก A: funnel แบบเรียงลำดับ (ต้องเกิดตามลำดับเวลา)</summary>

คำถาม: นับเฉพาะคนที่ `ask` **หลัง** `home_view` และ `itinerary_drafted` **หลัง** `ask`

```sql
with firsts as (
  select session_id,
    min(ts) filter (where event = 'home_view')         as t_visit,
    min(ts) filter (where event = 'ask')               as t_ask,
    min(ts) filter (where event = 'itinerary_drafted') as t_plan
  from tabi_events
  group by session_id
)
select
  count(t_visit)                                        as visited,
  count(*) filter (where t_ask > t_visit)               as asked_after_visit,
  count(*) filter (where t_ask > t_visit and t_plan > t_ask) as planned_after_ask,
  percentile_cont(0.5) within group (order by extract(epoch from t_plan - t_ask))
    filter (where t_plan > t_ask) / 60                  as median_minutes_to_plan
from firsts;
```
</details>

## 4. ที่มาของคน (ใช้วัดโพสต์ Facebook / TikTok)
```sql
select props->>'source' as source,
       count(distinct session_id) as sessions
from tabi_events
where event = 'home_view' and ts >= now() - interval '30 days'
group by 1
order by 2 desc;
```

## 5. แชร์แล้วมีคนเปิดไหม (viral)
```sql
with shared as (select distinct props->>'ref' as ref from tabi_events where event = 'trip_shared'),
opened as (
  select props->>'ref' as ref, count(distinct session_id) as openers
  from tabi_events where event = 'shared_trip_opened' group by 1
)
select count(*) as trips_shared,
       count(o.ref) as trips_opened_by_someone,
       coalesce(sum(o.openers), 0) as total_openers,
       round(coalesce(sum(o.openers), 0)::numeric / nullif(count(*), 0), 2) as openers_per_share
from shared s left join opened o using (ref);
```
`openers_per_share` > 1 = หนึ่งการแชร์พาคนใหม่มามากกว่าหนึ่งคน

## 6. Retention รายสัปดาห์ (cohort)
<details><summary>โจทย์ฝึก B: คนที่มาครั้งแรกสัปดาห์ X กลับมาใช้อีกในสัปดาห์ถัด ๆ ไปกี่ %</summary>

```sql
with first_week as (
  select session_id, date_trunc('week', min(ts)) as cohort
  from tabi_events group by session_id
),
activity as (
  select distinct e.session_id, f.cohort,
         (extract(epoch from date_trunc('week', e.ts) - f.cohort) / 604800)::int as week_n
  from tabi_events e join first_week f using (session_id)
)
select cohort::date,
       count(*) filter (where week_n = 0) as week0,
       round(100.0 * count(*) filter (where week_n = 1) / nullif(count(*) filter (where week_n = 0), 0), 1) as w1_pct,
       round(100.0 * count(*) filter (where week_n = 2) / nullif(count(*) filter (where week_n = 0), 0), 1) as w2_pct,
       round(100.0 * count(*) filter (where week_n = 4) / nullif(count(*) filter (where week_n = 0), 0), 1) as w4_pct
from activity
group by cohort
order by cohort;
```
หมายเหตุ: คนวางทริปญี่ปุ่นไม่ได้กลับมาทุกสัปดาห์ (ปีละ 1–2 ทริป) ค่า retention ต่ำเป็นเรื่องปกติ
ดู "กลับมาภายใน 30 วันก่อนวันเดินทาง" จะสะท้อนการใช้งานจริงกว่า
</details>

## 7. ข้อจำกัด
- ล้างข้อมูลเบราว์เซอร์ หรือเปลี่ยนเครื่อง = นับเป็นคนใหม่
- ตัวบล็อกโฆษณาบางตัวบล็อก `sendBeacon` ได้ ตัวเลขจริงอาจสูงกว่าที่เห็นเล็กน้อย
- event ก่อนตั้ง Supabase ไม่ถูกเก็บย้อนหลัง
