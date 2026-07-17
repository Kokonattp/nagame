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

- [ ] **U1 — สำรวจ + เขียน mapping** อ่าน `travel-dashboard.tsx` ทั้งไฟล์ + `app/city/[slug]/page.tsx`
      ทำตารางลงหัวข้อ "Mapping" ข้างล่าง: data ตัวไหนของ tier ไหน → เข้า card type ไหนที่**มีอยู่แล้ว**
      ตัวที่เข้าไม่ได้ → ใส่ "ค้างรอเจ้าของ" (อย่าเพิ่งแก้ contract)
- [ ] **U2 — ย้าย Tier 2 (day-plan) → card** เฉพาะส่วนที่ map เข้า card type เดิมได้
      (day-plan มี place/weather เป็นหลัก) · verify: `npx tsc --noEmit` + `npm run build`
- [ ] **U3 — ย้าย Tier 3 (ของฝาก/loot) → card** ส่วน recommendation → `PlaceCard` (มี `mapUrl` ผ่าน outbound อยู่แล้ว)
- [ ] **U4 — Tier 3 เตือนภัย (warnings/quakes)** ⚠️ **น่าจะติดกฎข้อ 1** — ถ้าไม่มี card type รองรับ ให้หยุดถาม
- [ ] **U5 — หน้าเมืองใช้ card แทน tier ที่ย้ายแล้ว** dashboard เหลือ Tier 1 + ส่วนที่ย้ายไม่ได้
- [ ] **U6 — verify จริง** `npm run build` ผ่าน + เปิดหน้าเมืองดูจริงว่า card ขึ้น + คลิกออกผ่าน outbound
- [ ] **U7 — gate สุดท้าย** push branch + เปิด PR (`gh pr create`) + อัปเดต roadmap Phase 1.5 ข้อ 2

## Mapping (U1 เขียนลงตรงนี้)

_(ยังว่าง — U1 เติม)_

## ค้างรอเจ้าของ (autoloop เขียนลงตรงนี้แล้วจบ turn)

_(ยังไม่มี)_

## Log รอบ

_(แต่ละรอบเติมบรรทัด: รอบที่ / ทำอะไร / commit hash / ผล verify)_
