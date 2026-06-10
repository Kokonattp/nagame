# Nagame — Development Log

บันทึกการพัฒนาเรียงตามเวลา (สรุปจาก git history + รายละเอียดการตัดสินใจ)

---

## 2026-06-11

### `ce635bd` — แบรนด์ดิ้งญี่ปุ่น, OG ใหม่, favicon, PWA
- **Favicon ใหม่**: ภูเขาฟูจิหิมะขาว + พระอาทิตย์แดงขึ้น บนกระดาษครีม (SVG เดียว
  generate PNG 192/512/maskable/apple-touch ด้วย Chrome headless)
- **OG image redesign**: กรอบ washi, พระอาทิตย์แดง, เงาภูเขาสองชั้น, ตัวอักษร 眺め
  ด้วย Noto Serif JP (โหลด subset จาก Google Fonts — ต้องใช้ UA `Mozilla/4.0`
  เพื่อให้ได้ TTF เพราะ satori ไม่รองรับ woff2)
- **ชื่อแอป**: "Nagame 眺め — Japan Travel Companion"
- **PWA**: `app/manifest.ts` + ไอคอนครบ ติดตั้งได้ทุก platform — จงใจไม่ใส่
  service worker กัน cache ค้าง
- ปุ่ม "ทุกเมือง" + โลโก้กดกลับหน้าหลักได้ (ก่อนหน้านี้ไม่มีทางกลับ landing)

## 2026-06-10 (วันใหญ่ — 13 commits)

### `f7ade5c` — Landing page, OG รุ่นแรก, รูปสถานที่, เกราะ AI
- ปลด redirect ตายตัวไป Fukuoka → หน้า landing โชว์ 41 เมืองพร้อมรูป + ค้นหา
- การ์ดกิน/เที่ยว/นอนมีรูปจาก Wikipedia (เจอ rate limit 429 ที่ ~10 req →
  แก้เป็น batch ≤50 ชื่อ/คำขอ + คิวกลาง 300ms + retry + ไม่ cache ผล fail)
- เกราะกันคอสต์ AI: จำกัด 300 ตัวอักษร, rate limit 6/นาที/IP, cache 15 นาที,
  ตัด context, เพิ่ม Gemini fallback ให้แชท (เดิมเช็คแค่ `AI_API_KEY` ของ OpenAI
  ทั้งที่ production มีแต่ `GEMINI_API_KEY` — แชทเลยเป็น rule-based มาตลอด)

### `4639e61` `1a61fda` — กล้องเล่นสดในแอป + เลือกจากแผนที่
- พบว่า Windy embed player ฝัง iframe ได้ (ไม่มี X-Frame-Options) แต่โค้ดเก่า
  แบนทั้งโดเมน → ปลดแบนเฉพาะ embed URL
- แถบ thumbnail สลับวิว + แผนที่ Leaflet ปักหมุดตำแหน่งกล้อง แตะเพื่อสลับ
- Modal มือถือ: fullscreen เลื่อนได้ (เดิม player 60vh + แผงข้างล้นจอ)

### `2ee3231` `08c5166` — Mapbox แล้ว revert
- ลอง Mapbox light tiles (สวยกว่า, ฟรี 50k loads/เดือน แต่ต้องจัดการ token +
  URL restriction) → ผู้ใช้เลือกกลับมาใช้ OSM เพราะไม่อยากจัดการ token

### `4c98880` — พร้อม launch
- sitemap.xml (42 URLs), robots.txt, `metadataBase`

### `ab216b1` — กล้องคัดมือ, แผ่นดินไหว, เรทเงิน
- คัด YouTube live 19 ตัว 12 เมือง (ตรวจทุกตัวผ่าน oEmbed ว่ายังออนไลน์ —
  คัดทิ้ง 3 ตัวที่ตายแล้ว) ขึ้นก่อนกล้อง Windy เสมอ
- การ์ดแผ่นดินไหว: P2PQuake API (ข้อมูล JMA, ฟรีไม่ใช้ key) รอบ 72 ชม.
  รัศมี 350 กม. + ป้ายเตือนสึนามิ
- การ์ดเรทเยน-บาท: open.er-api.com cache 6 ชม.

### `f0a92a8` — หมวดของฝาก/กิจกรรม + แก้รูปไม่ตรงสถานที่
- เพิ่ม kind `shop` (ของฝาก & คาเฟ่) และ `do` (กิจกรรมน่าทำ) — คัดมือ 12 เมืองหลัก
- **แก้รูปมั่ว**: รายการ fallback ชื่อสมมุติ ("Kyoto central park") ติดธง `generic`
  ไม่ค้นรูป / ตัดคำห้อย "base" ก่อนค้น / เกณฑ์แมตช์ ≥50% ของคำสำคัญ
  (กันเคส "Hakata" คำเดียวลากรูปท่าเรือมาใส่การ์ดราเม็ง)
- ลบ dead code `components/sections/`

### `b720b11` — รูป hero เสีย + ข้อมูลซ้ำ
- URL รูป hardcode จาก Wikimedia ตาย 4/6 (ไฟล์โดนลบ + ใช้ `file:` ผิดรูปแบบ)
  → ถอดทั้งหมด ใช้ Wikipedia API
- การ์ด "สรุปสั้น" ซ้ำกับ hero (อุณหภูมิ/ฝน/AQI) → เปลี่ยนเป็นข้อความสรุปจาก
  AI (`getAiSummary` ที่มีอยู่แล้วแต่ไม่เคยถูกใช้) + สูงสุด/ต่ำสุด

### `9faa816` `a56ff80` `7150699` — ไล่แก้ layout พังทั้ง 3 ระลอก
1. การ์ดตัวเลขอากาศบีบ → 2×2 เสมอ, ป้ายอุณหภูมิย่อบนมือถือ, ชิป wrap ได้
2. **ต้นเหตุใหญ่**: custom fr grid (`grid-cols-[1.45fr_0.95fr]`) ไม่มี minmax →
   แถบ thumbnail ดันคอลัมน์ขวาระเบิด hero เหลือเส้นตัวอักษรแนวตั้ง →
   ครอบ `minmax(0,…)` ทุกจุด + header sticky เฉพาะ md+
3. Chrome บางเวอร์ชันยังให้ scroll container ดันความกว้าง → `w-0 min-w-full`
   ที่แถบ thumbnail + `overflow-x-clip` ที่ main
- เริ่มมาตรฐานใหม่: ทุกการแก้ UI ถ่าย screenshot จริง (Chrome headless /
  puppeteer-core) ที่ความกว้างเท่าแคปผู้ใช้ก่อน push

## 2026-05-11 → 05-12 (ช่วงก่อตั้ง)

- โครงแอปแรก: Fukuoka mobile experience → ขยายเป็น 41 เมือง
- Redesign เป็น "premium travel webapp" ธีมกระดาษครีม + serif
- ฟอนต์ไทย/ญี่ปุ่น, bento sharing, Gemini fallback ของ AI summary

---

## สถานะปัจจุบัน (2026-06-11)

✅ เผยแพร่แล้วที่ nagame.vercel.app — ฟีเจอร์ครบ, mobile/desktop ผ่านการตรวจด้วย
screenshot จริง, คอสต์ ~$0–2/เดือน, เหลือเพียงจดโดเมนจริงและ submit Search Console
(ดูเช็คลิสต์ใน README.md)
