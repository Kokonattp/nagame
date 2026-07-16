Recover first: รัน `git status` — ถ้ารอบก่อนตายกลางคัน ให้ทำงานที่ค้างให้จบ (typecheck + commit) ก่อนเริ่มของใหม่.

จากนั้นทำต่อตาม docs/chat-cards-roadmap.md โดยดู state ปัจจุบันจาก docs/BUILD-STATE.md:
- ทำ 1-2 work unit ถัดไปที่ยังไม่ติ๊ก [x]
- **หลักการห้ามหลุด (อยู่ใน BUILD-STATE):** card = โค้ดประกอบจากข้อมูลจริง ไม่ใช่ LLM (LLM แค่พูดไทย split เป็น bubbles), fail-silent ของนอกพังไม่ล้มคำตอบ, ใช้ design tokens เดิม (--nb-vermilion/matcha/gold/indigo), ลิงก์ออกนอกทุกอันผ่าน buildOutbound() ใน lib/outbound.ts
- card UI ใช้สไตล์ loga board (ขอบหมึกหนา + pill สี hanko + เงาแข็ง) ปรับให้เข้า washi ญี่ปุ่น — ถ้าต้องการ reference สไตล์ loga เรียก skill loga-board-design ได้
- Next.js 15 เป็น fork: ถ้าเจอ API แปลกอ่าน node_modules/next/dist/docs/ ก่อน
- **ติดหนัก / ตัดสินใจสถาปัตยกรรมที่ผิดแล้วแก้ยาก → เรียก Fable ผ่าน skill fable-advisor** อย่าเดาเอง
- verify: `npx tsc --noEmit` ต้องผ่าน (unit ที่แตะ UI/หน้า → `npm run build` ต้องผ่านด้วย)
- commit local ทุก unit ที่เสร็จ (branch remove-manhole-pwa) — **อย่าเพิ่ง push จนถึง GATE**
- อัปเดต docs/BUILD-STATE.md (ติ๊ก [x] + เขียน Log 1 บรรทัด) แล้ว **จบ turn**

ถ้าทุก unit ถึง GATE ติ๊กครบแล้ว: รัน `npm run build` ให้ผ่าน, commit, **push ขึ้น remote (git push)** ตามที่เจ้าของสั่ง, แล้วเขียนบรรทัด "AUTOLOOP: COMPLETE" ท้าย docs/BUILD-STATE.md และตอบกลับแค่: AUTOLOOP: COMPLETE
