# Nagame — ทิศทางปัจจุบัน: "กร๊วกรวมของให้" (chat + cards)

> ตัดสินใจ 2026-07-16 · แทนแผน diorama full-rewrite ที่พักไว้ ([diorama-architecture.md](./diorama-architecture.md))
> สถานะ: **อนุมัติทิศแล้ว ยังไม่ลงมือเขียนโค้ด**

## ประโยคเดียวของ product

**"เพื่อนแมวคนไทยที่อยู่ญี่ปุ่น — ถามเรื่องเที่ยวเป็นภาษาไทย ได้คำตอบพร้อมข้อมูลจริง (ตั๋ว/ที่พัก/ร้าน/อากาศ) ในที่เดียว ไม่ต้องเปิด 5 เว็บ"**

- platform = ตัวรวมข้อมูลมาแสดง **ไม่ใช่ตัวจอง/รับเงิน** — conversion ออกทาง deep-link
- moat จริง = (1) ตัวตนกร๊วก + ภาษาไทย + บริบทคนไทย (ฮาลาล/แพ้กุ้ง/งบบาท) (2) distribution ผ่าน LINE (เพื่อนที่ทักมาเอง) — **"ข้อมูลสด" ไม่ใช่ moat** ใครก็ต่อ API ได้

## Business model (ล็อคแล้ว)

**ฟรี แสดงข้อมูลก่อน — ไม่มี paywall/subscription — แต่วาง "ท่อ" ไว้เสียบรายได้ทีหลังโดยไม่รื้อ**

- ทุก link ออกนอกแอปต้องผ่านฟังก์ชันกลาง `lib/outbound.ts` + log click ลง Supabase
  → click-out rate = ตัววัดรายได้ล่วงหน้าตั้งแต่วันแรก (ตอนนี้ deep-link เป็น `<a href>` ดิบหมด — ไม่มี logging สักบรรทัด)
- ท่อต้องรองรับ **หลาย merchant** ตั้งแต่ design — คนไทยจองผ่าน Agoda เป็นหลัก (คอม ~4-7%) ไม่ใช่ Rakuten (~1%) — เช็ค rate จริงก่อนผูก UX กับเจ้าเดียว
- รายได้อนาคต (เรียงความน่าจะเป็น): affiliate ที่พัก > Klook/กิจกรรม/JR Pass > ขนม/ของแต่งกร๊วก (microtransaction เชิงความผูกพัน แบบ LINE sticker) > sponsored challenge (ระวัง un-salesy) > ตั๋วบิน (คอมต่ำ)
- **ห้ามเด็ดขาด:** ระบบแต้ม/รางวัลที่แลกเป็นมูลค่าเงินได้ (บทเรียน Wirtual: token ร่วง 99.95% = retention ที่เช่ามา หายทันที)

## เมตริก (เลิกพูดคำว่า "retention" เฉยๆ — product นี้ใช้ปีละ ~1 ครั้ง)

1. **Planning-window retention** — คนที่เริ่มถาม กลับมาต่อภายใน 14 วันไหม (ช่วงวางแผน 1-3 เดือนก่อนบิน)
2. **Funnel depth** — ถาม → เปิด card → คลิกออก → เพิ่มลงทริป
3. **During-trip activation** — ถึงญี่ปุ่นแล้วเปิดไหม
4. **Share/referral rate** — ปีละครั้ง = บอกต่อสำคัญกว่าใช้ซ้ำ

⚠ เงื่อนไขบังคับ: **LINE Login ต้องมาพร้อม launch** — identity ตอนนี้เป็น device id + localStorage
(ล้าง cache = คนเดิมกลายเป็นคนใหม่ → เมตริกทุกตัวข้างบนวัดไม่ได้/ต่ำกว่าจริงแบบเงียบ)

## ความเสี่ยงเรียงลำดับจริง

1. **Acquisition — "คนไทยจะเปิดกร๊วกครั้งแรกทำไม"** ← ใหญ่สุด ยังไม่มีแผน ทดสอบถูกๆ (TikTok/เพจกร๊วก/LINE OA) คู่ขนานกับ build
2. Retention ระหว่างปี → คำตอบ = เลี้ยงกร๊วก (Phase 3)
3. Monetization → ท่อวางแล้วค่อยเสียบ
- LLM cost **ไม่ใช่ความเสี่ยงหลัก** — Haiku ~$0.003/คำตอบ (1,000 users × 20 ข้อความ ≈ $60) — เอาเวลาไปลง distribution

## สิ่งที่ reject แล้ว (อย่า re-litigate โดยไม่มีข้อมูลใหม่)

- ❌ **MapLibre turn-by-turn นำทางเอง** — ญี่ปุ่น = transit เป็นหลัก, ทำตารางรถไฟฟรีไม่ได้ (GTFS ไม่ครบ/Navitime แพง), "อยู่ในแอปนาน" เป็น vanity metric. ยึดเดิม: nav = deep-link Google. (MapLibre เป็นแค่ตัวเลือก render แผนที่สวยแทน Leaflet ได้ในอนาคต — คนละเรื่องกับ nav)
- ❌ diorama 2.5D full rewrite ตอนนี้ — พักไว้ (ถ้าฟื้น: PixiJS v8 ตาม [diorama-architecture.md](./diorama-architecture.md))
- ❌ paywall/subscription ตอนนี้
- ❌ แต้มแลกเงิน/token ทุกรูปแบบ

---

## Roadmap

### Phase 0 — ท่อ + ผ่าแชท (~1 สัปดาห์) · REAL
1. **`lib/outbound.ts`** — ฟังก์ชันกลางทุก link ออกนอก + click logging ลง Supabase (~ครึ่งวัน, ทำก่อนทุกอย่าง)
2. **ผ่า `ChatPanel` ออกจาก `travel-dashboard.tsx`** (864 บรรทัด) — prerequisite ของทุกอย่าง
3. **Contract ใหม่ `ChatReply`** — `{ text, cards[], stageCommand? }`
   - **card = โค้ดประกอบจากข้อมูลจริง ไม่ใช่ LLM** (LLM พูดไทยอย่างเดียว) → ไม่มี hallucination เข้า UI, fail-silent เป็นธรรมชาติ
   - formalize multi-bubble: server split เป็น `bubbles: string[]` (เลิกพึ่งสัญญาใจ `\n\n`)
4. **หน้าแรก = แชทกร๊วก ไม่บังคับเลือกเมืองก่อน** — เมืองไหลจากบทสนทนา:
   - ถามระบุเมือง → โค้ด match ชื่อ (`resolveCity` มีแล้ว) → context เมืองนั้น
   - ถามไม่มีเมือง ("เดือนนี้ไปไหนดี") → context ระดับประเทศ (สรุป season รายเดือน-รายภูมิภาค ก้อนกะทัดรัดจาก `lib/cities/seasons.ts` — กัน token บวม)
   - advisor เผื่อ swap ไส้ intent parser ไว้แล้ว (comment ใน advisor.ts) — กริดเมืองเดิมย้ายไปใต้แชท
   - หน้าแรกแบบนี้ = คำตอบ acquisition ด้วย (ลิงก์ที่แชร์ได้คือ "ลองถามแมวตัวนี้")

### Phase 1 — Card จริง 3 แหล่ง (~2-3 สัปดาห์) · Rakuten/Places REAL, fli fail-silent
- **ที่พัก:** `lib/services/stays.ts` — Rakuten Travel API ทางการ (ห้าม reverse) + เตรียม Agoda ผ่านท่อ outbound
- **ร้านอาหาร:** Google Places API + filter บริบทไทย (ฮาลาล/มังฯ/แพ้กุ้ง)
- **ตั๋วบิน:** `lib/services/flight-signal.ts` — optional enrichment, cache หนัก, timeout สั้น, **ห้ามอยู่ใน critical path**
  - fail แบบซื่อสัตย์: "วันนี้กร๊วกเช็คราคาตั๋วไม่ได้ เดี๋ยวลองใหม่" + ปุ่ม Google Flights — **ไม่ใช่หายเงียบ** (เพื่อนที่แกล้งไม่ได้ยิน = เสียความเชื่อใจ)
- card มี: รูป, ราคา (฿ บาท), YouTube/webcam, อากาศช่วงนั้น, ปุ่ม "ไปยังไง" (deep-link ผ่าน outbound)
- ⚠ ก่อนจบเฟส: **ย้าย rate-limit + cache ออกจาก in-memory Map** (`/api/assistant`) — serverless หลาย instance = limit ไม่ทำงานจริง + Rakuten/Places มี quota จริง

### Phase 2 — Trip drag-drop + กร๊วกร่างทริป + LINE Login + เมตริก (~2-3 สัปดาห์)
- **กร๊วกร่างทริปอัตโนมัติ** — "ไปโตเกียว 5 วัน" → ร่างทริปทั้งก้อนให้ก่อน แล้วผู้ใช้ลากปรับ:
  - โค้ดล้วน ไม่ใช่ LLM คิดแผน (ตามหลัก card): จับกลุ่มสถานที่ตามย่าน (`area-coords` มีแล้ว)
    → ย่านใกล้กันอยู่วันเดียวกัน, เรียงวันตามพยากรณ์ 16 วัน (วันฝน=ของในร่ม), กร๊วกเล่าเหตุผลทับ
  - ต่อยอด `day-plan.ts` เดิม (1 วัน → หลายวัน) + ดึงของจาก wish list เข้าโครง
  - นี่คือเหตุผลที่คนอยากลากวาง — มีร่างให้ปรับ ดีกว่าหน้าว่างให้จัดเอง
- Trip แท็บ: ลากวางสลับลำดับ/วัน (dnd-kit, DOM ล้วน) — card จากแชทเพิ่มลงทริปได้
  (schema เดิมเผื่อไว้แล้ว: เพิ่ม field `day`/`order`)
- LINE Login + ย้าย identity จาก device id → บัญชีจริง (Supabase มีอยู่แล้ว)
- ติดเมตริก 4 ตัวข้างบน + dashboard ดูเองง่ายๆ

### Phase 3 — เลี้ยงกร๊วก (retention ระหว่างปี)
- ให้ขนม/ของฝากกร๊วกรายวัน (ได้ขนมจากการใช้แอป: เก็บแสตมป์/ทำแพลนเสร็จ) — ต่อยอด "stamp economy นอกทริป" ใน PROJECT_MEMORY
- **กติกา:** ความผูกพันล้วน (ร่าง/ชุด/ท่าใหม่) — ไม่มี guilt-trip, ไม่มีแมวผอมโซ, ไม่แลกเงินได้, จ่ายเงินจริง = option ทีหลังเมื่อ loop ติดแล้ว
- during-trip mode + after-trip recap (จาก v1 spec เดิม)

### อนาคต (เมื่อของหลักพิสูจน์แล้ว)
- diorama 2.5D (PixiJS v8) เป็น "ของขวัญ" เสริม
- sponsored challenge กับแบรนด์ (โปร่งใสว่าสปอนเซอร์)
- เมืองที่สอง

---

*ที่มา: เจ้าของหด scope 2026-07-16 หลังประเมิน diorama full-rewrite "ไม่น่ารอด" · business thesis ตรวจโดย Fable (ผ่านครึ่ง แก้ 3 รู: ท่อ affiliate ยังไม่มีจริง, เมตริก retention ผิด lifecycle, MapLibre nav เป็นกับดัก) · บทเรียน Wirtual: pet loop ดี แต่ห้ามผูกเงิน*
