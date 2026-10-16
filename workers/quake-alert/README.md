# quake-alert worker

ฟัง P2PQuake (ส่งต่อประกาศ 気象庁) แล้วส่ง Web Push ภาษาไทยให้คนที่ทริปอยู่ในจังหวัดที่ถูกเตือน
กติกาว่าส่งอะไรให้ใคร + ข้อความทั้งหมด: [docs/quake-alerts.md](../../docs/quake-alerts.md)

ต้องรัน **ตลอด 24 ชม. บนเครื่องเดียว** (Vercel ทำไม่ได้ เพราะต้องเปิด WebSocket ค้างไว้)
P2PQuake จำกัด 2 การเชื่อมต่อต่อ IP — อย่ารันซ้อนกันเกิน 1 ตัว

## เปิดใช้ครั้งแรก (เจ้าของทำ)

1. Supabase: รัน `supabase/schema.sql` ส่วน `push_subscriptions` ใน SQL editor
2. สร้างกุญแจ: `cd workers/quake-alert && npm install && npx web-push generate-vapid-keys`
3. Vercel: ใส่ `VAPID_PUBLIC_KEY` (+ `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` ถ้ายังไม่มี) → deploy → ปุ่ม "เปิดแจ้งเตือน" จะขึ้นในการ์ดความปลอดภัยของหน้าทริป
4. เครื่อง worker: ตั้ง env แล้วรัน

```
SUPABASE_URL=...  SUPABASE_SERVICE_KEY=...
VAPID_PUBLIC_KEY=...  VAPID_PRIVATE_KEY=...  VAPID_SUBJECT=mailto:you@example.com
node index.mjs
```

ใช้ process manager ให้รีสตาร์ทเองเมื่อดับ (เช่น `pm2 start index.mjs --name quake-alert` หรือ Task Scheduler/systemd)

## ทดสอบโดยไม่ส่งจริง

```
npm test                                                      # กติกา 7 ข้อ (ใช้ EEW จริง 16 ต.ค. 2026)
node index.mjs --replay fixtures/eew-2026-10-16.json --subs subs.json   # replay พิมพ์ข้อความออกจอ
node index.mjs --sandbox --dry --subs subs.json               # ต่อ sandbox ของ P2PQuake (ส่งข้อมูลปี 2023 ทุก ~30 วิ)
```

`subs.json` = อาร์เรย์แถวแบบตาราง เช่น
`[{"endpoint":"https://fcm.googleapis.com/fcm/send/demo","p256dh":"x","auth":"y","prefectures":["Tokyo"],"starts_on":"2026-10-15","ends_on":"2026-10-20"}]`

## ข้อจำกัด

- P2PQuake ฟรีแต่ไม่รับประกัน ไม่มีระบบสำรอง — worker ดึง `/history` เติมช่องว่างทุกครั้งที่ต่อใหม่
- EEW ที่เก่ากว่า 3 นาทีจะไม่ส่ง (แรงสั่นผ่านไปแล้ว), 地震情報/สึนามิ เก่ากว่า 30 นาทีไม่ส่ง
- ความจำว่าใครได้อะไรไปแล้วอยู่ในหน่วยความจำ — รีสตาร์ทกลางเหตุการณ์อาจส่งซ้ำ 1 ครั้ง
- iPhone ได้รับเฉพาะเมื่อเพิ่ม Nagame ลงหน้าจอโฮม (iOS 16.4+) และไม่ดังทะลุโหมดเงียบ
