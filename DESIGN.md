# Nagame Design Direction

สถานะ: `GO_LIVE_CANDIDATE`

## Visual world — สถานีต้นทาง / Travel dispatch desk

Nagame ควรให้ความรู้สึกเหมือนผู้ใช้ยืนอยู่หน้าโต๊ะเตรียมเดินทางในสถานีญี่ปุ่น: มีตารางออกเดินทาง เส้นทางที่ยังไม่ครบ และเจ้าหน้าที่เพื่อนร่วมทางที่ช่วยเช็กให้ทีละเรื่อง ไม่ใช่แผนที่โลกหรือ dashboard สถิติ

## Product translation

- Conversation = เคาน์เตอร์คุยกับกร๊วก
- User intent = จุดหมาย/ชานชาลาที่กำลังเลือก
- Evidence = ป้ายข้อมูลอากาศ ที่พัก ตั๋ว อาหาร และกล้องสด
- Saved plan = boarding stub ที่สะสมจากคำตอบ แล้วเรียงเป็น card deck ที่ผู้ใช้จัดการเอง
- Next action = departure cue เดียวที่ควรทำต่อ

## Material and palette

- Night-station indigo: `#101a35` — main environment and quiet depth
- Ticket paper: `#fff8ec` — reading surfaces and plan sheets
- Signal vermilion: `#ef5b3d` — primary action and active route state
- Platform yellow: `#f3c84b` — attention and decision markers
- Route cyan: `#75c3bf` — supporting evidence and links
- Ink: `#0b1226` — rules, labels, and high-contrast text on paper

No gradient text, no glass UI, no generic metric cards, and no hard offset shadows. Depth comes from seams, paper overlap, and a limited elevation scale.

## Type and composition

- Thai body: IBM Plex Sans Thai for reliable reading at small sizes.
- Display: Bai Jamjuree for Thai-first station-board headings and route labels.
- Desktop: editorial 12-column layout; conversation is the primary column and the plan rail is a persistent companion column.
- Mobile: conversation first; the plan rail becomes an ordered section below the conversation and remains reachable without a modal.
- The visual hierarchy is made by scale, rule lines, column placement, and state marks; saved cards may be filtered and expanded for actions without becoming a dense dashboard.

## Interaction and states

- Three start actions become the first set of departure choices.
- Sending a prompt moves the user from a start state into a conversation state.
- Cards are evidence rows with explicit source/action labels; they can be saved into the plan.
- Saved items remain visible in the plan rail; users can filter all/important/completed, change a card status, export/import the plan, or remove a card. There is no fixed daily card rule.
- The plan is local-first: IndexedDB is the working store and a `.nagame` file is the portable backup.
- Loading says what Kruak is checking. Errors explain recovery. Missing providers are labeled as unavailable, never filled with invented data.
- Reduced motion removes route-line movement and uses direct state changes.

## Future reach

The same grammar can extend to the Trip page, during-trip mode, weather warnings, and a post-trip recap without turning the product into a live-camera directory.
