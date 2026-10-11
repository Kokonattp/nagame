# เปิดใช้: เข้าสู่ระบบ + เก็บทริปออนไลน์ + กันใช้งานผิดปกติ

> สำหรับ: เจ้าของ (ทำเองบนเว็บ LINE / Supabase / Vercel) · โค้ดพร้อมแล้ว ใส่ key เมื่อพร้อม
> ห้ามส่ง key ในแชท ใส่ผ่าน Vercel เท่านั้น

ก่อนใส่ key ทุกอย่างทำงานเหมือนเดิม: ทริปอยู่ในเครื่อง หน้าโปรไฟล์บอกว่ายังไม่ต้องสมัคร

## 1. ฐานข้อมูล (Supabase, ฟรี)
1. สร้าง project ที่ https://supabase.com (region Singapore)
2. SQL Editor → วางทั้งไฟล์ `supabase/schema.sql` → Run (สร้าง `tabi_trips`, `tabi_events` และตารางเดิม)
3. Project Settings → API → คัดลอก `Project URL` และ `service_role` key
```powershell
cd D:\TT\nagame
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_KEY production
```

## 2. เข้าสู่ระบบด้วย LINE
1. https://developers.line.biz → Create provider → Create channel → **LINE Login**
2. Callback URL: `https://nagame.vercel.app/api/auth/callback/line`
3. ไม่ต้องขอสิทธิ์ email (ทาบิขอแค่ `openid profile`)
4. คัดลอก Channel ID / Channel secret
```powershell
npx auth secret            # สร้าง AUTH_SECRET แล้วคัดลอกค่า
vercel env add AUTH_SECRET production
vercel env add AUTH_LINE_ID production
vercel env add AUTH_LINE_SECRET production
```

## 3. (ทางเลือก) Google
Google Cloud Console → APIs & Services → Credentials → OAuth client (Web)
Authorized redirect URI: `https://nagame.vercel.app/api/auth/callback/google`
```powershell
vercel env add AUTH_GOOGLE_ID production
vercel env add AUTH_GOOGLE_SECRET production
```

## 4. Deploy แล้วเช็ก
```powershell
vercel redeploy nagame.vercel.app
```
- เปิดหน้า **โปรไฟล์** → ต้องเห็นปุ่ม "เข้าสู่ระบบด้วย LINE"
- เข้าสู่ระบบ → เห็นชื่อ + "ทริปซิงก์อัตโนมัติแล้ว"
- เปิดอีกเครื่อง เข้าสู่ระบบบัญชีเดิม → ทริปตรงกัน
- ปุ่ม "ลบข้อมูลทั้งหมด" ลบทั้งในเครื่องและออนไลน์

## 5. กันใช้งานผิดปกติ (แนะนำทำพร้อมกัน)
- **เพดาน Jev ต่อวัน:** มีในโค้ดแล้ว (ค่าเริ่ม 3 ล้าน token/วัน ต่อ server) เกินแล้วทาบิตอบแบบไม่ใช้ Jev
  ปรับได้: `vercel env add JEV_DAILY_TOKEN_CAP production` (เช่น 2000000)
- **Vercel Firewall (ฟรี):** Vercel Dashboard → project nagame → Firewall → Add Rule
  - ถ้า Path เท่ากับ `/api/tabi` และ Method `POST` → **Rate Limit** 20 ครั้ง / 60 วินาที ต่อ IP → Deny
  - ถ้า Path เริ่มด้วย `/api/tabi/event` → Rate Limit 60 / 60 วินาที
- ดูว่ามีใครยิงถี่ได้ที่ Vercel → Observability / Firewall logs

## ข้อมูลที่เก็บ (สรุปสำหรับแจ้งผู้ใช้)
| เก็บ | ไม่เก็บ |
|---|---|
| id จาก LINE/Google, ชื่อที่แสดง, รูปโปรไฟล์ | อีเมล, เบอร์โทร |
| ทริปที่บันทึก (เมือง วัน ที่เที่ยว) | ข้อความแชทที่พิมพ์ |
| สถิติการใช้งานแบบไม่ระบุตัวตน | IP (ใช้แค่จำกัดความถี่ชั่วคราวในหน่วยความจำ) |
