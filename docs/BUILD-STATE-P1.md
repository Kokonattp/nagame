# BUILD-STATE — Phase 1: card ข้อมูลจริง 3 แหล่ง (dual-mode)

> branch: feat/phase1-real-cards · เจ้าของสั่ง "ทำ Phase 1 ก่อน แล้วค่อยจัดหน้าแรก · เปิด autoloop จัดการเอง"
> **Stop marker:** `AUTOLOOP: COMPLETE` ท้ายไฟล์เมื่อ verify+push เสร็จ

## หลักการ (เหมือน Phase 0)
- card = โค้ดประกอบจากข้อมูลจริง ไม่ใช่ LLM · fail-silent ของนอกพังไม่ล้มคำตอบ
- **dual-mode ทุก service**: ไม่มี key → available:false → ไม่มี card ใบนั้น ไม่พัง (เจ้าของยังไม่มี key ตัวไหนเลย)
- ทุก outbound ผ่าน buildOutbound()

## Work units — โค้ดเขียนเสร็จหมดแล้ว (mainline/Opus) เหลือ verify

- [x] **P1.1 stays.ts** — commit แล้ว. Rakuten SimpleHotelSearch + แปลงเยน→บาท (fx.thbPer100Jpy/100) + affiliate. env: RAKUTEN_APP_ID (+RAKUTEN_AFFILIATE_ID). cache 6ชม.
- [x] **P1.2 places.ts** — เขียนเสร็จ (ยังไม่ commit). Google Places API (New) v1 searchText + field mask + diet filter (halal/vegetarian/no-shrimp) + Places Photo. env: GOOGLE_PLACES_API_KEY. cache 12ชม.
- [x] **P1.3 flight-signal.ts** — เขียนเสร็จ. fli optional: timeout 2.5s, fail→Google Flights deep-link (ซื่อสัตย์ ไม่เดาราคา), เดา arrival airport จากภูมิภาค. env: FLI_API_URL (+FLI_API_KEY).
- [x] **P1.4 advisor ต่อ 3 service** — เขียนเสร็จ. parseCardIntent (กิน/นอน/บิน + diet) → buildCityCards ยิง stays/places/flight ขนาน (Promise.all, fail-silent) → เรียง card ตาม intent. place = fallback เมื่อไม่มีของจริง.

- [ ] **P1.5 GATE — verify + commit + push** ⚠️ ค้างเพราะ classifier (Bash tool) ล่มชั่วคราว
  วิธีทำเมื่อ Bash กลับมา:
  1. `npx tsc --noEmit` ต้องผ่าน (โค้ด review ด้วยตาแล้ว คาดว่าผ่าน — จุดเสี่ยงที่แก้ไปแล้ว: placePicks เขียน explicit ไม่ใช้ spread as const)
  2. `rm -rf .next && npm run build` ต้องผ่าน (static generation)
  3. รัน dev :4100 ทดสอบ dual-mode: **ไม่มี key ใดๆ → API city-level ยังตอบได้ (weather/webcam/place เหมือน Phase 0) ไม่มี stay/eat/flight card = fail-silent ถูกต้อง ไม่ error**
  4. commit P1.2-P1.4 + push branch feat/phase1-real-cards
  5. เขียน AUTOLOOP: COMPLETE ท้ายไฟล์นี้

## หมายเหตุ
- verify dual-mode สำคัญสุด: จุดขายคือ "ไม่มี key ก็ไม่พัง" — ต้องเห็น API ยังตอบ 200 + card เดิม (Phase 0) ยังออก
- เมื่อเจ้าของใส่ key จริงทีหลัง → stay/eat/flight card โผล่เองทันที ไม่ต้องแก้โค้ด
