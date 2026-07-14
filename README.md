# Nagame 眺め — Japan Travel Companion

> เว็บแอปเที่ยวญี่ปุ่นแบบ "เห็นหน้างานจริง" — เลือกเมืองแล้วเช็คอากาศ ฝุ่น กล้องสด อีเวนต์
> แผ่นดินไหว เรทเงิน และไอเดียกิน-เที่ยว-นอน ครบในหน้าเดียว พร้อมผู้ช่วย AI

**Production:** https://nagame.vercel.app · **Repo:** https://github.com/Kokonattp/nagame

---

## ฟีเจอร์หลัก

| ฟีเจอร์ | รายละเอียด |
|---|---|
| 🏙️ 41 เมืองทั่วญี่ปุ่น | ข้อมูล config เต็มรูปแบบ + ค้นหาเมืองอื่นนอกลิสต์ได้ผ่าน geocoding |
| 🌤️ อากาศสด | อุณหภูมิ, feels like, สูงสุด/ต่ำสุด, โอกาสฝน, ลม (Open-Meteo) |
| 😮‍💨 คุณภาพอากาศ | AQI พร้อมป้ายระดับภาษาไทย (OpenAQ / OpenWeather) |
| 📹 กล้องสด | กล้อง YouTube คัดมือ 19 ตัวใน 12 เมืองหลัก + Windy อีก 12 ตัว/เมือง เล่นสดในแอป สลับวิวจากแถบ thumbnail หรือ**แผนที่** (Leaflet + OSM) |
| 🗾 เมืองใกล้เคียง | เรียงตามระยะทางจริง (haversine) พร้อมรูปและระยะ กม. |
| 🍜 ไอเดียทริป 5 หมวด | ไปไหนดี / กินอะไรดี / นอนไหนดี / ของฝาก & คาเฟ่ / กิจกรรมน่าทำ — เมืองหลักคัดมือ เมืองรองมีชุด fallback พร้อมรูปจริงจาก Wikipedia |
| 🚨 แผ่นดินไหว | เหตุการณ์รอบ 72 ชม. รัศมี 350 กม. + เหตุรุนแรงทั่วประเทศ พร้อมป้ายเตือนสึนามิ (P2PQuake / ข้อมูล JMA) |
| ⛑️ เตือนภัยอากาศ | ประกาศ JMA รายภูมิภาค (พายุ/ฝนหนัก/หิมะ/ขั้นวิกฤต) แปลไทย 3 ระดับ + แบนเนอร์แดงเมื่อรุนแรง refresh ทุก 10 นาที |
| 🚉 สายรถจากสถานี | เส้นทางคัดมือ 11 เมืองหลักบนแผนที่ กดไฮไลต์สาย + ตั๋ว pass แนะนำ + ลิงก์ Google Maps transit |
| 🚗 ขับรถ & mapcode | จุดขับรถ 8 เมือง (Hokkaido, Fuji, Alps) พร้อม mapcode กด copy ใส่ car navi หรือเบอร์โทรค้นใน navi + กฎจอดรถสำคัญ เช่น โควตารถ Shirakawa-go |
| 🌸 Season radar | ช่วงพีคซากุระ/ใบไม้แดง/เทศกาล 20 เมือง พร้อมป้าย "กำลังพีค / อีก X วัน" + แบนเนอร์เตือนช่วง Golden Week, Obon, ปีใหม่ |
| 🗺️ POI อัตโนมัติ | จุดน่าสนใจรอบเมืองรัศมี 10 กม. จาก Wikipedia GeoSearch — ครอบทุกเมืองรวมเมืองนอกลิสต์ ไม่ต้องคัดมือ |
| 💴 เรทเงินเยน-บาท | 100 / 1,000 / 10,000 เยนเป็นบาท อัปเดตทุก 6 ชม. |
| 🤖 AI Insight | แชทถามแผนเที่ยวอิง context ของหน้า (Gemini Flash-Lite หรือ OpenAI) + สรุปสั้นรายเมือง |
| 📰 ข่าว/อีเวนต์ | RSS feed รายเมือง |
| 📱 PWA | ติดตั้งเป็นแอปได้ทั้ง Android / iOS / Desktop |
| 🔗 OG Image | ภาพแชร์สไตล์ญี่ปุ่น (眺め + พระอาทิตย์แดง + เงาภูเขา) สร้างอัตโนมัติรายเมือง |

## เริ่มพัฒนา

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # ตรวจ type + build production
```

### Environment Variables (`.env.local` หรือ Vercel)

```bash
OPENWEATHER_API_KEY=      # อากาศสำรอง (มี free tier)
OPENAQ_API_KEY=           # คุณภาพอากาศ
WINDY_WEBCAMS_API_KEY=    # กล้อง Windy รายเมือง
ANTHROPIC_API_KEY=        # Claude Haiku 4.5 — ตัวเลือกแรกของแชท (กร๊วก voice ดีสุด)
AI_API_KEY=               # OpenAI (gpt-4o-mini) — fallback แชท
GEMINI_API_KEY=           # Gemini 2.5 Flash-Lite — fallback แชท + AI summary
```

ไม่มี key ตัวไหนแอปก็ยังทำงาน: อากาศใช้ Open-Meteo (ฟรีไม่ใช้ key), กล้องใช้ลิสต์ YouTube
คัดมือ, AI ตอบด้วยกฎสำเร็จรูปภาษาไทย

## สถาปัตยกรรมย่อ

```
app/
  page.tsx                    # Landing: ค้นหา + การ์ด 41 เมืองพร้อมรูป (ISR 1 วัน)
  city/[slug]/page.tsx        # หน้าเมือง: ดึงทุก signal แบบ parallel (ISR 30 นาที)
  city/[slug]/opengraph-image # OG รายเมือง (ImageResponse + Noto Serif JP subset)
  api/assistant               # แชท AI พร้อมเกราะกันคอสต์
  api/{weather,aqi,webcams,events,geocode,summary}
  manifest.ts                 # PWA manifest
lib/
  cities/city-configs.ts      # ข้อมูล 41 เมือง: พิกัด, livecams (YouTube), คำแนะนำ 5 หมวด
  cities/travel-meta.ts       # intro/mood, เมืองใกล้เคียง, fallback recommendations
  services/                   # weather, aqi, webcams, quakes, fx, events, geocode,
                              # ai-summary, city-images (Wikipedia)
components/
  travel-dashboard.tsx        # หน้าเมืองทั้งหมด (client)
  city-search.tsx             # ช่องค้นหา + suggestion
  webcam-map.tsx              # แผนที่เลือกกล้อง (Leaflet, dynamic import)
```

### การไหลของการค้นหาเมือง

ช่องค้นหา → `/api/geocode` → ลำดับ: (1) 41 เมืองใน config → (2) seed list →
(3) Nominatim (OSM) สำหรับเมืองใดก็ได้ในญี่ปุ่น → redirect ไป `/city/[slug]`
ทุก signal ดึงตามพิกัดจริงของเมืองนั้น

### ระบบรูปภาพ (Wikipedia)

- รูปเมือง/สถานที่ดึงจาก Wikipedia pageimage API แบบ **batch** (≤50 ชื่อ/คำขอ)
  ผ่านคิวกลางเว้นจังหวะ 300ms + retry เมื่อโดน 429 (Wikipedia ลิมิต ~10 req รัว ๆ)
- ชื่อที่แมตช์ต้องตรง ≥ 50% ของคำสำคัญ ไม่งั้นไม่แสดงรูป (กันรูปผิดสถานที่)
- รายการ fallback ที่เป็นชื่อสมมุติติดธง `generic` — ไม่ค้นรูปเลย
- ผล fail ชั่วคราว**ไม่ถูก cache** → หน้าเติมรูปเองตอน ISR revalidate

### เกราะกันคอสต์ AI (`/api/assistant`)

1. จำกัดคำถาม 300 ตัวอักษร (client + server)
2. Rate limit ต่อ IP: เรียกโมเดล 6 ครั้ง/นาที — เกินแล้วตอบกฎ fallback ฟรี
3. Cache คำตอบ 15 นาที ต่อ (เมือง + คำถาม + ช่วงโอกาสฝน) — ปุ่ม quick prompt ชนโมเดลแค่ครั้งแรก
4. ตัด context ก่อนส่ง: อีเวนต์ 3 รายการ, คำแนะนำ 4 รายการ/หมวด, note ตัดที่ 120 ตัวอักษร
5. AI summary: cache 45 นาที/เมือง, จำกัด 120 token

**ประเมินคอสต์รวม: ~$0–2/เดือน** (ทุก API ภายนอกฟรี, AI โดน cache เกือบหมด,
Vercel Hobby ฟรี) — จุดจ่ายจริงมีแค่โดเมน (~$9–11/ปี)

## บทเรียน/การตัดสินใจที่บันทึกไว้

| เรื่อง | การตัดสินใจ |
|---|---|
| Custom fr grid (`grid-cols-[1.45fr_0.95fr]`) | ต้องครอบ `minmax(0,…)` เสมอ ไม่งั้น min-content ของลูก (เช่น แถบ thumbnail) ระเบิดคอลัมน์จน hero เหลือเส้นเดียว |
| แถบเลื่อนแนวนอน | ใช้ `w-0 min-w-full` กัน intrinsic width ดันการ์ด — พฤติกรรม scroll container ต่างกันตาม Chrome เวอร์ชัน |
| กัน overflow ทั้งหน้า | `overflow-x-clip` ที่ `<main>` (ใช้ `clip` ไม่ใช่ `hidden` เพื่อไม่ทำ sticky พัง) |
| รูป hero เมือง | ห้าม hardcode URL จาก Wikimedia (ไฟล์โดนลบ/เปลี่ยนชื่อได้) — ดึงผ่าน API แล้ว cache แทน |
| Windy webcams | ส่วนใหญ่เป็นกล้องเฝ้าระดับน้ำ มุมไม่สวย → คัด YouTube live (ตรวจ oEmbed ว่ายังออนไลน์) ขึ้นก่อนเสมอ |
| Windy embed | ฝัง iframe ได้ (ไม่มี X-Frame-Options) — อย่าแบนทั้งโดเมน |
| ฟอนต์ใน OG image | satori ไม่รองรับไทย/ญี่ปุ่นโดย default — โหลด Noto Serif JP subset จาก Google Fonts ด้วย UA `Mozilla/4.0` เพื่อให้ได้ TTF (woff2 ใช้ไม่ได้) |
| PWA | ใส่แค่ manifest ไม่ใส่ service worker — กัน cache ค้าง ผู้ใช้ได้เวอร์ชันใหม่เสมอ |
| ตรวจ UI | ทุกการแก้ layout ให้ถ่าย screenshot จริงด้วย Chrome headless (มี `puppeteer-core` เป็น devDependency) ที่ 390/768/1280/1905px ก่อน push |

## เช็คลิสต์หลัง deploy / สิ่งที่ค่อยทำต่อ

- [ ] จดโดเมนจริง (Porkbun/Spaceship ~$9–11/ปี) แล้วแก้ `metadataBase` ใน
      `app/layout.tsx` และ `BASE_URL` ใน `app/sitemap.ts` + `app/robots.ts`
- [ ] Submit sitemap ใน Google Search Console
- [ ] เปิด Vercel Analytics (ฟรี)
- [ ] แชร์ Facebook แล้วภาพเก่าค้าง → [Sharing Debugger](https://developers.facebook.com/tools/debug/) กด Scrape Again
- [ ] (อนาคต) ประกาศเตือนพายุ/ฝนหนักรายจังหวัดจาก JMA (ต้องทำตาราง map รหัสพื้นที่ 47 จังหวัด)
- [ ] (อนาคต) เพิ่ม YouTube livecam เมืองรองใน `lib/cities/city-configs.ts` ฟิลด์ `livecams`

## Data Sources (ฟรีทั้งหมด)

[Open-Meteo](https://open-meteo.com) · [OpenAQ](https://openaq.org) ·
[Windy Webcams](https://api.windy.com) · [Wikipedia/Wikimedia](https://www.wikipedia.org) ·
[Nominatim (OSM)](https://nominatim.org) · [P2PQuake (JMA)](https://www.p2pquake.net) ·
[open.er-api.com](https://www.exchangerate-api.com) · YouTube Live embeds · Google Fonts
