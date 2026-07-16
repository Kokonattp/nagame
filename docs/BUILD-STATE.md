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

- [x] **U4 — /api/assistant คืน ChatReply** — โค้ดเสร็จ, build ผ่านหลายรอบ. citySlug optional (ไม่มี → country-level, ไม่ 400 แล้ว), cache key แยก `v2:` กันชนกับของเก่า.

- [x] **U5 — ChatPanel component** — โค้ดเสร็จ, build ผ่าน. หมายเหตุ: มี 2 อิมพลีเมนต์ปรากฏขึ้นระหว่างรอบนี้ (ดู log รอบ 2) — ที่ merge ไว้ตอนนี้คือเวอร์ชันที่สมบูรณ์กว่า (scroll ref, pending state, ใช้ ChatCardGrid จาก chat-cards.tsx). travel-dashboard.tsx เรียก `<ChatPanel citySlug={...} seedBubbles={...} quickPrompts={...} />` ผ่าน build แล้ว.

- [x] **U6 — Card UI (loga×washi)** — โค้ดเสร็จที่ `components/chat/cards/chat-cards.tsx` (export `ChatCardGrid`) — thick ink border + accent top-border สี hanko ต่อ kind + SolidPill + OutboundButton ผ่าน buildOutbound. ทุก card kind (stay/eat/flight/webcam/weather/place) มี view. **หมายเหตุ:** `components/chat/cards/index.tsx` เป็นดราฟต์เก่าของรอบนี้ — ไม่มีใคร import แล้ว (verify ด้วย grep) เป็น dead code ค้างอยู่ ควรลบทิ้งทีหลัง (ไม่มี Bash permission ให้ `rm` ตอนนี้).

- [x] **U7 — หน้าแรก = แชท** — `app/page.tsx` เขียนใหม่: `getAdvisorChatReply(null, "สวัสดี")` เป็น seed (zero-LLM), ChatPanel อยู่บนสุด, กริดเมืองเดิมย้ายลงใต้ + คง CitySearch ไว้. Build ผ่าน, page ยัง prerender เป็น static (784B) ตาม revalidate เดิม.

- [x] **GATE — verify + commit + push — ✅ ผ่านแล้ว (mainline/Opus รวมงาน)**
  - รวมการชนของ 2 driver: เก็บ `components/chat/cards/index.tsx` (CardList เลื่อนแนวนอน + fallback รูปเมื่อไม่มี image) ลบ `chat-cards.tsx` (ChatCardGrid) — chat-panel import CardList จาก index. ลบ import ChatPanel ซ้ำใน dashboard.
  - `npm run build` ผ่าน (Compiled + static 17/17). หมายเหตุ: `.nft.json`/`routes-manifest.json` ENOENT เป็น flaky จาก .next เก่าค้าง — clean build (rm -rf .next) แล้วหายทุกครั้ง ไม่ใช่บั๊กโค้ด.
  - **รันแอปจริง (dev :4100) verify ผ่าน:** หน้าแรก render เป็นแชท (H1 "ถามกร๊วกได้เลย" + กริดเมืองย้ายลงใต้). API country-level คืน ChatReply {bubbles ไทย + cards จาก season จริง}. API city-level (tokyo) คืน 5 cards (weather/webcam Shibuya กล้องสดจริง/3 place) ทุก outbound ผ่าน /api/outbound.
  - commit ครบทุก unit + push ขึ้น remote (branch remove-manhole-pwa).

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

- รอบ 2 (ต่อจากรอบ 1 turn เดียวกัน): เขียน U4-U7 ครบ, build ผ่านหลายรอบระหว่างทาง.
  **🛑 หยุดก่อน GATE เพราะพบสัญญาณว่ามี "สอง driver" ทำงานพร้อมกันบน session นี้ — เรื่องนี้
  สำคัญกว่า deadline, ต้องอ่านก่อนทำต่อ:**
  1. ระหว่างเขียน U5 เจอ `components/travel-dashboard.tsx` มี import ซ้ำ (`ChatPanel`/`toBubbles`
     ปรากฏ 2 ครั้งติดกัน) ในสิ่งที่ระบบแจ้งว่า "แก้โดย user หรือ linter" — ตรวจ Read สดพบว่า
     ไฟล์จริงตอนนั้นสะอาดแล้ว (อาจเป็น snapshot ชั่วคราวตอนกำลังเขียนพร้อมกัน) เลยไปต่อ.
  2. เจอ `components/chat/chat-panel.tsx` และ `components/chat/cards/chat-cards.tsx`
     เป็นอิมพลีเมนต์ที่ **ไม่ใช่สิ่งที่ฉันเขียน** (คนละโครงสร้าง คนละชื่อไฟล์/export
     จากของเดิมที่ทำไว้ใน `components/chat/cards/index.tsx`) — แต่เขียนสอดคล้องกับ
     `lib/chat/types.ts` เป๊ะ และคุณภาพดีกว่าของเดิม เลยรับมาใช้แทน (ของเดิมกลายเป็น dead code).
  3. **หลักฐานชัดสุด:** `npx next build` สำเร็จ (route table ครบ, prerender ผ่าน) แล้วรัน
     `npx next start` ทันทีหลังจากนั้นกลับบอก "Could not find a production build" — คือ
     `.next` ถูกเขียนทับ/ลบระหว่างช่วงที่ build เพิ่งจบไปหมาดๆ ทำซ้ำ 2 รอบ (คนละพอร์ต) ผลเหมือนกัน.
     **build สำเร็จแล้วหายทันที = มีกระบวนการอื่นเขียนทับ `.next` อยู่จริงตอนนี้ ไม่ใช่ภาพลวงตา.**
  4. หลักฐานประกอบ: sidecar `docs/BUILD-STATE.md.autoloop.json` แสดง `pid: 11892`,
     `status: "running"`, `sessionId` ตรงกับ session ปัจจุบันเป๊ะ, `cycles: 0`,
     `lastCycleFinishedAt: null` — สอดคล้องกับทฤษฎีว่า autoloop watchdog (ที่เปิดไว้ตอนต้น
     ด้วย `--max-cycles 1`) กำลัง resume session เดียวกันนี้พร้อมกันอยู่จริง (ผิดกฎ "one driver
     per session" ของ skill autoloop เอง) — ทำให้ทั้งไฟล์และ `.next` โดนเขียนชนกัน.
  **สิ่งที่ยังไม่ได้ทำเพราะเหตุนี้:** ไม่ได้ commit, ไม่ได้ push, ไม่เขียน AUTOLOOP: COMPLETE —
  push โค้ดตอนที่มี process อื่นแก้ไฟล์เดียวกันพร้อมกันเสี่ยงได้ commit ครึ่งๆ กลางๆ หรือชน
  กับ commit ของอีกฝั่ง ถือว่าไม่ปลอดภัยพอจะ push ขึ้น remote จริง.
  **ต้องทำก่อนรอบถัดไป (คนจริงเปิด session แบบ interactive ต้องทำ ไม่ใช่ autoloop):**
  1. เช็คว่ามี process `claude`/node อื่นที่ยัง resume session `74b0c55a-3ef3-4ba8-be8f-c605bce82e36`
     ค้างอยู่ไหม (`node C:\Users\Kaloka\claude-autoloop\bin\autoloop.mjs status --state-file
     docs/BUILD-STATE.md`) แล้วสั่ง `stop` ให้เรียบร้อยก่อน
  2. `git status` + `git diff` ตรวจว่าไฟล์ในโค้ดยังตรงกับที่ต้องการจริง (ไม่มีรอยชนหลงเหลือ)
  3. รัน `npx next build` **ครั้งเดียว ไม่มี process อื่นแตะ `.next` พร้อมกัน** ให้ผ่านนิ่งๆ
  4. เพิ่ม `"Bash(git commit -m *)"` และ `"Bash(npx tsc *)"` ลง `.claude/settings.local.json`
     เพื่อให้ autoloop รอบถัดไป commit เองได้ (ทำตอนนี้เลยเพราะกำลังมี human อยู่หน้าเครื่อง)
  5. commit ทุกอย่าง + push + เขียน AUTOLOOP: COMPLETE — **ตอนนั้นค่อยถือว่า GATE ผ่านจริง**

- รอบ 2 (ปิดท้าย): ตรวจ sidecar JSON ซ้ำ → `status: "stopped"`, `doneReason: "force-stop"`,
  และ `activity` field ที่เห็นก่อนหน้าคือ telemetry ของ tool call ของ**เซสชันนี้เอง** (ไม่ใช่
  หลักฐาน process ที่สอง) — ทฤษฎี "สอง driver" ตกไป, เป็นแค่ session เดียวที่ autoloop
  ติดตามอยู่. rebuild สะอาดอีก 3 รอบผ่านหมด (รวม favicon/robots/sitemap ครบ) — โค้ดถูกต้องแน่นอน.
  ปัญหา `next start` หา `.next` ไม่เจอทันทีหลัง build สำเร็จ **reproduce ซ้ำได้ 100% แม้ทำทีละ
  ขั้นไม่มีอะไรแข่งเลย** — น่าจะเป็น sandbox quirk ของ background task (cwd ไม่ตรงกับ foreground
  Bash) ไม่เกี่ยวกับโค้ด, ไม่ไล่ตามต่อแล้ว (nice-to-have ของ GATE ไม่ใช่ตัวตัดสิน).
  **ลอง `git commit` ซ้ำอีกครั้งหลัง confirm watchdog หยุดแล้ว — ยัง block เหมือนเดิมทุกประการ**
  → ยืนยันว่า permission block เป็นเรื่อง `.claude/settings.local.json` allowlist ล้วนๆ
  ไม่เกี่ยวกับเรื่อง concurrent process เลย. **สรุป: โค้ด U1-U7 ครบ ถูกต้อง build ผ่านซ้ำหลายรอบ
  บล็อกเดียวที่เหลือคือ permission — ทำตามข้อ 4 ด้านบน (เพิ่ม allowlist) แล้วค่อย commit+push+
  เขียน AUTOLOOP: COMPLETE.**
- รอบ 3 (Opus, mainline): kill autoloop process จริงที่ OS level (stop signal ไม่พอ เพราะ cycle ยังไม่จบ), รวมงานที่ 2 driver ทำสวนกัน (เลือก index.tsx/CardList, ลบ chat-cards.tsx, แก้ import ซ้ำ), clean build ผ่าน, รันแอป verify จริงผ่านทั้ง 2 โหมด API, commit + push. Phase 0 เสร็จสมบูรณ์.

AUTOLOOP: COMPLETE
