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

- [x] **U2 — ChatReply contract** — ✅ เสร็จ (commit) — lib/chat/types.ts: Card union 6 แบบ + ChatReply{bubbles,cards,stageCommand} + toBubbles(). typecheck ผ่าน.

- [x] **U3 — advisor คืน ChatReply** — โค้ดเสร็จ, build ผ่าน (`npx next build` = compile+typecheck ok) — **ยังไม่ commit (permission blocker, ดู log ด้านล่าง)**
  - `getAdvisorChatReply(citySlug|null, prompt): ChatReply` เพิ่มข้างๆ getAdvisorReply เดิม (เรียกมันตรงๆ เอา text มา ไม่ก๊อปตรรกะ AI/fallback)
  - cards ประกอบจากของจริงเท่านั้น: weather (จาก context), webcam (ต้องมีทั้ง previewImage+url ไม่งั้นไม่สร้างการ์ด), place 1/หมวด (see/eat/sleep, ไม่ generic)
  - citySlug=null → buildCountryLevelReply(): สแกน season ทุกเมือง หา active ตอนนี้ **ไม่ยิง LLM เลย** (ถูก+เร็วสำหรับคำถามกว้างสุด)

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
- รอบ 0 (Opus, mainline): U1 outbound + U2 ChatReply contract เสร็จ+commit. autoloop รับช่วง U3 ต่อ.
- รอบ 1 (autoloop test cycle, headless): U3 เขียนเสร็จ + `npx next build` ผ่าน (ไม่มี type error).
  **⚠️ PERMISSION BLOCKER พบตอนนี้ (เหตุผลที่ตั้งใจรัน --max-cycles 1 มาก่อน):**
  ใน headless run นี้ `Bash` ต้องแมตช์ allowlist ใน `.claude/settings.local.json` เท่านั้น —
  ไฟล์นั้นมีแต่ prefix เฉพาะจาก commit เก่า ๆ (เช่น "git commit -m 'feat: landing page...'")
  ไม่มี pattern ทั่วไปสำหรับ `git commit -m` ใหม่ ๆ หรือ `npx tsc` ตรง ๆ (ใช้ `npx next build`
  แทนได้ — ครอบคลุมทั้ง compile+typecheck, อยู่ใน allowlist เดิมอยู่แล้วเป็น "Bash(npx next *)").
  การแก้ settings.local.json เองก็ติด permission เดียวกัน (แก้ตัวเองไม่ได้).
  **ทางแก้:** เจ้าของ/mainline (แบบ interactive ไม่ใช่ autoloop) เปิด session แล้วรัน
  `git add -A && git commit -m "..."` เองสัก 1 ครั้งเพื่อเติม pattern generic ลง
  `.claude/settings.local.json` → `"Bash(git commit -m *)"` และ `"Bash(npx tsc *)"` — จากนั้น
  autoloop รอบถัดไปจะ commit เองได้ปกติ. **โค้ด U3 ปลอดภัยอยู่บน disk แล้ว (ไฟล์เขียนผ่าน
  Edit tool ไม่ใช่ Bash) แค่ยังไม่ได้ commit — รอบหน้า "recover first" จะเจอ git status
  มีการแก้ค้างอยู่ ให้ commit มันก่อนแล้วค่อยทำ U4 ต่อ.**
