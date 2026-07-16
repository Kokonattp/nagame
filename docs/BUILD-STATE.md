# BUILD-STATE — Phase 0: แชท+card contract (autoloop)

> งานนี้รันด้วย autoloop ข้ามคืน · เจ้าของสั่ง "ทำมาเลย ตัดสินใจไปก่อน อยากเห็นว่าเสร็จแล้วเป็นยังไง"
> **Stop marker:** เมื่อทุก unit ผ่าน gate สุดท้าย → เขียน `AUTOLOOP: COMPLETE` ท้ายไฟล์นี้
> **เจ้าของสั่งเพิ่ม:** เสร็จแล้ว commit + **push ขึ้น remote** (ทำใน gate สุดท้าย)

## หลักการ (อย่าหลุด)
- ทำ 1-2 unit/รอบ → verify (typecheck) → commit local → อัปเดตไฟล์นี้ → จบ turn
- **card = โค้ดประกอบจากข้อมูลจริง ไม่ใช่ LLM** (LLM แค่พูดไทย) — ห้าม hallucination เข้า UI
- fail-silent: ของนอกพัง → ไม่มี card ใบนั้น ไม่ล้มทั้งคำตอบ
- ใช้ design tokens เดิม (neo-brutalist washi + hanko: --nb-vermilion/matcha/gold/indigo) — loga board style ปรับให้เข้าญี่ปุ่น
- Next.js 15 เป็น fork: อ่าน node_modules/next/dist/docs/ ก่อนถ้าเจอ API แปลก
- **ติดหนัก/ตัดสินใจสถาปัตยกรรม → เรียก Fable ผ่าน skill fable-advisor** (อย่าเดาเอง)
- ห้ามแตะ lib/services/* (สมอง) เกินจำเป็น — เพิ่ม contract ใหม่ ไม่รื้อของเดิม

## Work units

- [x] **U1 — lib/outbound.ts** — ✅ เสร็จ (commit) — buildOutbound + isSafeOutboundTarget + /api/outbound (302+log dual-mode) + clickouts table. typecheck ผ่าน.

- [ ] **U2 — ChatReply contract** — `lib/chat/types.ts`
  - `type Card` = union: StayCard | EatCard | FlightCard | WebcamCard | WeatherCard | PlaceCard (มี kind discriminator)
  - `type ChatReply = { bubbles: string[]; cards: Card[]; stageCommand?: {...} }`
  - แต่ละ card มี field พอ render + outbound url ผ่าน U1
  - verify: typecheck

- [ ] **U3 — advisor คืน ChatReply** — `lib/services/advisor.ts`
  - เพิ่ม `getAdvisorChatReply(citySlug|null, prompt): ChatReply` (ไม่แตะ getAdvisorReply เดิม — เพิ่มข้างๆ)
  - โค้ดประกอบ cards จาก context เดิม (recommendations/webcam/weather) — LLM แค่คืน text → split เป็น bubbles
  - รองรับ citySlug = null (ถามกว้าง ๆ ไม่มีเมือง) → context ระดับประเทศจาก seasons
  - verify: typecheck

- [ ] **U4 — /api/assistant คืน ChatReply** — `app/api/assistant/route.ts`
  - เพิ่ม response `{ reply: ChatReply }` (คง string reply เดิมเป็น fallback ได้)
  - citySlug optional: ไม่มี → ตอบระดับประเทศ ไม่ 400
  - verify: typecheck

- [ ] **U5 — ChatPanel component** — `components/chat/chat-panel.tsx`
  - แยก logic แชท (state/submit/render) ออกจาก travel-dashboard เป็น component เดี่ยว shell-agnostic
  - รับ props: citySlug?, seedBubbles, cityName? → คืน UI แชทเต็ม
  - travel-dashboard ใช้ ChatPanel แทน inline (dashboard ยังทำงานเหมือนเดิม)
  - verify: typecheck + build

- [ ] **U6 — Card UI (loga×washi)** — `components/chat/cards/`
  - การ์ดญี่ปุ่นสไตล์ loga board (thick ink border + hanko color pills + solid shadow) ปรับ washi
  - StayCard/EatCard/FlightCard/WebcamCard/WeatherCard — แต่ละใบมีรูป/ราคา/pill สถานะ/ปุ่ม outbound
  - WebcamCard ใช้ previewImage จาก webcam service (ภาพกล้องสด) — กำกับ "สดเมื่อสักครู่"
  - verify: build

- [ ] **U7 — หน้าแรก = แชท** — `app/page.tsx`
  - หน้าแรกเปิดมาเจอ ChatPanel (citySlug=null) ทันที — ถามได้เลยไม่บังคับเลือกเมือง
  - กริดเมืองเดิมย้ายลงใต้แชท (คงไว้ คนรู้ปลายทางคลิกตรงได้)
  - verify: build + รันแอปดูจริง (/run หรือ next build)

- [ ] **GATE — verify + commit + push**
  - `npm run build` ผ่าน + typecheck ผ่าน
  - รันแอปดูหน้าแรกเป็นแชท + ถามแล้วได้ card (screenshot ถ้าทำได้)
  - commit ทุกอย่าง (branch เดิม remove-manhole-pwa) + **push ขึ้น remote**
  - เขียน AUTOLOOP: COMPLETE ท้ายไฟล์

## Log (แต่ละรอบเขียนสั้น ๆ ว่าทำอะไร)
- (ยังไม่เริ่ม)
