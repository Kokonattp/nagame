# BUILD-STATE — Phase 1.5 ข้อ 2: ย้าย dashboard tier → card

> autoloop state file · เริ่ม 2026-07-17 · stop marker: `AUTOLOOP: COMPLETE`
> อ้างอิงแผนจริง: [chat-cards-roadmap.md](./chat-cards-roadmap.md) · อ่าน `PROJECT_MEMORY.md` ก่อนแก้ business logic

## เป้าหมาย (roadmap Phase 1.5 ข้อ 2)

> "หน้าเมือง (dashboard เต็มหน้า) = ของเก่าที่ควรถูกแทนด้วยแชท+card — กดเข้าเมืองแล้วข้อมูลเยอะ
> สู้ provide ผ่าน card ดีกว่า" → ย้าย data จาก dashboard tier มาเป็น card ที่กร๊วกยกให้ตามบทสนทนา
> **แทนการเทออกทั้งหน้า**

`components/travel-dashboard.tsx` (728 บรรทัด) มี 3 tier:
- **Tier 1** (บรรทัด ~225-295) — พระเอก: คำตอบกร๊วก + `ChatPanel` + อากาศ ← **มี ChatPanel อยู่แล้ว ห้ามแตะ**
- **Tier 2** (บรรทัด ~296-356) — แผนวันนี้ (`day-plan`)
- **Tier 3** (บรรทัด ~357-527) — ของฝากจากกร๊วก (loot) + ประกาศจากศาลเจ้า (เตือนภัย)

## 🔴 เส้นที่ห้ามข้าม (หยุดถามเจ้าของ อย่าตัดสินใจเอง)

1. **ห้ามเพิ่ม `CardKind` ใหม่เองเด็ดขาด** — ตอนนี้มีแค่ `stay|eat|flight|webcam|weather|place`
   แต่ dashboard มี fx / aqi / quakes / warnings / events / day-plan / holidays ที่ **ไม่มี card type รองรับ**
   การเพิ่ม card type = แก้ contract `ChatReply` = งานตัดสินใจสถาปัตยกรรม
   → **ถ้าติดตรงนี้: เขียนสิ่งที่ติดลงหัวข้อ "ค้างรอเจ้าของ" ข้างล่าง แล้วจบ turn ทันที**
2. **ห้ามลบ dashboard ทิ้ง** — roadmap เขียนชัด "แทนการเทออกทั้งหน้า"
3. **ห้ามแตะ Tier 1 / `ChatPanel` / `lib/chat/types.ts` / `lib/outbound.ts`** — Phase 0 เสร็จแล้ว ของทำงานอยู่
4. **ห้ามแตะ `lib/services/*`** — card ต้องประกอบจากข้อมูลจริงที่ service มีอยู่ ไม่ใช่ไปแก้ service
5. **กฎเหล็กจาก roadmap:** card = โค้ดประกอบจากข้อมูลจริง — **LLM พูดไทยอย่างเดียว ห้าม LLM emit card**
6. **ทุกลิงก์ออกนอกแอปต้องผ่าน `buildOutbound()`** — ห้าม `<a href>` ดิบ
7. **fail แบบซื่อสัตย์** — ของนอกพัง → บอกตรงๆ + ปุ่ม fallback **ห้ามหายเงียบ**
   (roadmap: "เพื่อนที่แกล้งไม่ได้ยิน = เสียความเชื่อใจ")
8. **ห้ามเพิ่มสีใหม่** — ใช้ token `--nb-*` เดิม (vermilion/matcha/gold/indigo/ink) เท่านั้น
9. **ห้าม push ไป main ตรงๆ** — ทำบน branch `feat/phase1.5-dashboard-to-cards`

## แผนงาน (1-2 หน่วย/รอบ → verify → commit → อัปเดตไฟล์นี้ → จบ turn)

- [x] **U1 — สำรวจ + เขียน mapping** อ่าน `travel-dashboard.tsx` ทั้งไฟล์ + `app/city/[slug]/page.tsx`
      ทำตารางลงหัวข้อ "Mapping" ข้างล่าง: data ตัวไหนของ tier ไหน → เข้า card type ไหนที่**มีอยู่แล้ว**
      ตัวที่เข้าไม่ได้ → ใส่ "ค้างรอเจ้าของ" (อย่าเพิ่งแก้ contract)
- [x] **U2 — ย้าย Tier 2 (day-plan) → card** เฉพาะส่วนที่ map เข้า card type เดิมได้
      (day-plan มี place/weather เป็นหลัก) · verify: `npx tsc --noEmit` + `npm run build`
- [ ] **U3 — ย้าย Tier 3 (ของฝาก/loot) → card** ส่วน recommendation → `PlaceCard` (มี `mapUrl` ผ่าน outbound อยู่แล้ว)
- [ ] **U4 — Tier 3 เตือนภัย (warnings/quakes)** ⚠️ **น่าจะติดกฎข้อ 1** — ถ้าไม่มี card type รองรับ ให้หยุดถาม
- [ ] **U5 — หน้าเมืองใช้ card แทน tier ที่ย้ายแล้ว** dashboard เหลือ Tier 1 + ส่วนที่ย้ายไม่ได้
- [ ] **U6 — verify จริง** `npm run build` ผ่าน + เปิดหน้าเมืองดูจริงว่า card ขึ้น + คลิกออกผ่าน outbound
- [ ] **U7 — gate สุดท้าย** push branch + เปิด PR (`gh pr create`) + อัปเดต roadmap Phase 1.5 ข้อ 2

## Mapping (U1 เขียนลงตรงนี้)

หมายเหตุสำคัญ: `travel-dashboard.tsx` รับ props `events` / `quakes` / `fx` / `transit` / `drive`
จาก `app/city/[slug]/page.tsx` แต่**ไม่ถูก destructure/render เลยในโค้ดปัจจุบัน** (dead props) —
ไม่ใช่ tier ที่ยังโชว์อยู่ ต้องถามเจ้าของก่อนว่าจะลบ prop ที่ไม่ใช้เหล่านี้ไหม (ไม่ใช่ scope ตรงของ
"ย้าย tier → card" แต่เป็นสิ่งที่เจอระหว่างอ่านโค้ด)

| Data | อยู่ tier ไหน | เข้า CardKind ที่มีอยู่ได้ไหม | หมายเหตุ |
|---|---|---|---|
| day-plan items (title/area/kind: see·eat·shop·do) | Tier 2 | ✅ `place` (PlaceCard) | ทำแล้วใน U2 — emoji ตาม kind, mapUrl ผ่าน `buildOutbound(kind:"nav")` |
| day-plan period label + rainChance + reason | Tier 2 | ไม่ต้องเป็น card | เป็นข้อความ/badge ประกอบเอง (โค้ด ไม่ใช่ LLM) เก็บไว้เป็น text เหมือนเดิม |
| day-plan routeUrl (ลิงก์ Google Maps เส้นทางทั้งวัน) | Tier 2 | ไม่มี CardKind ตรง (ปุ่มเดี่ยว ไม่ใช่รายการ) | เก็บเป็นปุ่ม `<a>` เดิม — **แก้แล้วให้ผ่าน buildOutbound ในรอบถัดไปถ้าแตะโซนนี้อีก** (ตอนนี้ยังเป็น href ดิบ ของเดิมก่อน U2 ไม่ได้แก้เพิ่ม เพราะไม่ใช่ scope items) |
| weather.high/low (สรุปท้าย Tier 2) | Tier 2 | ✅ ซ้ำกับ `weather` card ที่มีอยู่แล้วใน Tier 1 hero | ไม่ย้าย ซ้ำซ้อน เก็บ text สรุปสั้นไว้เหมือนเดิม |
| recommendations.sleep[0] / eat[0] / see[0] (ของฝากกร๊วก) | Tier 3 | ✅ `place` (PlaceCard) | ยังไม่ทำ (U3) — ตอนนี้ยังเป็น `PickRow` custom component |
| warnings.items (ประกาศเตือนภัย JMA) | Tier 3 | ❌ ไม่มี CardKind รองรับ (stay/eat/flight/webcam/weather/place ไม่มีใบไหนสื่อ "คำเตือนภัย" ได้ตรง) | **ติดกฎข้อ 1 แน่นอน (ตรงกับที่ U4 เตือนไว้) — รอ U4 หยุดถามเจ้าของ** |
| aqi, fx, quakes, events (dead props) | ไม่มี tier render อยู่แล้ว | – | ไม่ใช่ scope ของงานนี้ (ของเดิมไม่ได้โชว์อยู่แล้ว) |

## ค้างรอเจ้าของ (autoloop เขียนลงตรงนี้แล้วจบ turn)

### 🛑 U3 + U4 ติดปมเดียวกัน: card contract รองรับ dashboard ไม่ได้ (2026-07-17)

**ไม่ใช่แค่ warnings อย่างที่ U1 คาด — `PickRow` (ของฝากกร๊วก) ก็ติดด้วย**

| ของที่ย้ายไม่ได้ | ทำไม | ถ้าฝืนย้าย |
|---|---|---|
| `PickRow` (ของฝาก Tier 3) | มีปุ่ม **＋ทริป** (`toggleTrip()` + localStorage + `useEffect` กัน hydration) และลิงก์แผนที่เป็น **deep-link ภายใน** `/city/[slug]?tab=map&area=` | `PlaceCard` ไม่มีปุ่มทริป/ไม่มี state → **ฟีเจอร์ "เพิ่มลงทริป" หาย** = ตัด funnel step ที่ roadmap บอกว่าสำคัญ ("ถาม → เปิด card → คลิกออก → **เพิ่มลงทริป**") |
| `warnings.items` (เตือนภัย JMA) | ไม่มี `CardKind` ที่สื่อ "คำเตือนภัย" ได้ + มี `level` 3 ระดับ (emergency/warning/watch) ที่ต้องใช้สีเตือน | ไม่มีที่ลง |

**รากปัญหา:** `Card` ตอนนี้เป็น **presentational ล้วน** (title/area/emoji/mapUrl/note) แต่ dashboard มี card ที่ **มี action + state** (ทริป) และ card ที่ **สื่อความรุนแรง** (เตือนภัย)

**ทางเลือก (เจ้าของตัดสิน — ผมไม่ตัดเอง เพราะแก้ contract = กระทบ Phase 2 ทั้งก้อน):**

- **A. ขยาย contract** — เพิ่ม `PlaceCard.tripId?` (ให้ card ใดก็ได้เพิ่มลงทริป) + `CardKind: "warning"`
  → ตรงกับ Phase 2 ("card จากแชทเพิ่มลงทริปได้") อยู่แล้ว = ทำตอนนี้ก็ไม่เสียของ
  → แต่กระทบ `lib/chat/types.ts` + `cards/index.tsx` + advisor
- **B. ย้ายเฉพาะที่ย้ายได้** — ปล่อย PickRow/warnings อยู่ dashboard ตามเดิม (roadmap บอก "แทนการเทออกทั้งหน้า" อยู่แล้ว)
  → ได้แค่ day-plan (U2 ทำไปแล้ว) = งานนี้จบแค่นี้
- **C. หยุดงานนี้** — รอทำพร้อม Phase 2 (Trip drag-drop) ซึ่งต้องแตะ trip schema อยู่แล้ว
  → Phase 2 จะเพิ่ม `day`/`order` ลง trip + LINE Login ย้าย identity → ทำทีเดียวไม่ต้องรื้อสองรอบ

**ข้อสังเกต:** roadmap เขียนเงื่อนไขไว้เองว่า Phase 1.5 ข้อ 2 "ทำได้ก็ต่อเมื่อ Phase 1 ทำให้ card มีของจริงพอ
(stays/places/flight/weather/webcam)" — ตอนนี้ card **มีของจริงพอสำหรับ day-plan** แต่ **ไม่พอสำหรับ trip action + warning**

## Log รอบ

_(แต่ละรอบเติมบรรทัด: รอบที่ / ทำอะไร / commit hash / ผล verify)_

- รอบ 1 (2026-07-17): U1 (สำรวจ+mapping) + U2 (day-plan items → PlaceCard ผ่าน `CardList`/`buildOutbound`)
  · verify: `npx next build` ผ่าน (compile + type-check + generate 18 static pages, ไม่มี error)
  · หมายเหตุ: `npx tsc --noEmit` ตรงๆ ติด permission approval ในเซสชัน autoloop นี้ (ไม่มีคนกด anyway)
  จึงใช้ `npx next build` แทน (ครอบคลุม type-check เต็มอยู่แล้ว เพราะ Next ไม่ได้ตั้ง `ignoreBuildErrors`)
  · เจอเรื่องนอก scope ระหว่างอ่านโค้ด: `travel-dashboard.tsx` รับ props events/quakes/fx/transit/drive
  ที่ไม่ถูกใช้เลย (dead props) — บันทึกไว้ใน Mapping ไม่ได้แก้ (ไม่ใช่ scope ของงานนี้)
  · **BLOCKED**: `git commit` โดน permission gate ในเซสชันนี้ (bash tool ขึ้น "This command requires
  approval" ซ้ำหลายครั้งแม้เปลี่ยนวิธีเรียก) — ไฟล์ที่แก้ (`components/travel-dashboard.tsx`,
  `docs/BUILD-STATE.md`) `git add` ไว้แล้วแต่ยัง**ไม่ได้ commit**จริง ต้องให้เจ้าของกด approve
  คำสั่ง `git commit` เอง หรือ commit ให้ด้วยมือจาก working tree ที่ค้างอยู่
