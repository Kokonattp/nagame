# Nagame → Diorama 2.5D — แผน "อนาคต" (พักไว้ ยังไม่ทำ)

> ⚠️ **สถานะ 2026-07-16: DEFERRED (พักไว้).** เจ้าของประเมินว่า diorama 2.5D full scope
> "ใหญ่เกินจะรอด" → หด scope ลงเหลือ **แชท + card + ต่อ API** ก่อน. **แผนที่กำลังทำจริงตอนนี้
> อยู่ที่ [`chat-cards-roadmap.md`](./chat-cards-roadmap.md).** เอกสารนี้เก็บไว้เป็นทิศทางระยะยาว —
> เมื่อของหลัก (แชท+card+trip) อยู่ตัวแล้ว ค่อยกลับมาเสริม diorama เป็น "ของขวัญ" ทีหลัง.
>
> Engine ที่เลือกไว้ (ถ้ากลับมาทำ) = **PixiJS v8** (Fable วิเคราะห์: art pipeline เป็น PNG 2D
> → three.js จ่าย complexity เปล่า). รายละเอียดด้านล่างยังใช้อ้างอิงได้.

---

## (แผนเดิม — full diorama rewrite, พักไว้)

## วิสัยทัศน์ (8 ข้อจากเจ้าของ)

1. แชท AI หา **ตั๋ว / ที่พัก / ร้านอาหาร** — ต่อ fli, Rakuten, ร้านอื่นๆ
2. ผลลัพธ์แสดงเป็น **card สไตล์ญี่ปุ่นสวยงาม** (ไม่ใช่ text bubble ล้วน)
3. platform = **ตัวรวมข้อมูลมาแสดง** ไม่ใช่ตัวจอง/รับเงิน (deep-link ออก)
4. แนะนำ "ไปที่นี่ต้องไปยังไง / ช่วงเวลาไหน" + ดึง **YouTube + ข้อมูลอากาศ** มาแสดงในการ์ด
5. **trip plan ลากวางสลับได้** (drag-drop) เห็นภาพคร่าวๆ
6. เป็น **insight** ช่วยมือใหม่ถามได้
7. ทำให้ **อยากกลับมาใช้อีก** (retention)
8. แผนที่สไตล์ art

---

## การตัดสินใจสถาปัตยกรรม

### Engine: **PixiJS v8**
เลือก Pixi ไม่ใช่ three.js เพราะ **art pipeline ผลิต PNG 2D วาดมือ ไม่ใช่ 3D model**
(ดู `docs/kruak-image-prompts.md`). diorama วาดมือบน three.js สุดท้ายก็เป็น sprite บนกล้อง
2D อยู่ดี = จ่ายค่า complexity ของ 3D เปล่าๆ.

- **Trade-off ที่ยอมรับแล้ว:** วันหน้าอยากได้กล้องหมุนรอบเมือง / แสงเงา 3D จริง → Pixi ไปไม่ถึง ต้อง port scene module. กันความเสี่ยงด้วยการแยก renderer ไว้หลัง interface (ดู lib/stage ด้านล่าง)
- **กติกาบังคับ:** dynamic import client-only, `devicePixelRatio` ≤ 2, spritesheet ต่อ district, **handle `webglcontextlost/restored`** (มือถือ Safari ทำ context หายบ่อย — ไม่ handle = จอดำเงียบ)

### หลักการใหญ่: สมองอยู่ server เหมือนเดิม — diorama เป็นแค่ presentation layer ใหม่
`advisor.ts` + `lib/services/*` + `lib/cities/*` ไม่รู้จัก Leaflet อยู่แล้ว → ไม่มีอะไรผูกกับ 2D map.

| ชิ้น | ชะตากรรม |
|---|---|
| `lib/services/*` + `lib/cities/*` + `advisor.ts` + `/api/assistant` | **เก็บทั้งหมด** (แก้เฉพาะ contract คำตอบ) |
| `app-shell.tsx` (slot-based อยู่แล้ว) | เก็บ — diorama = slot `map` ตัวใหม่ |
| `washi-map.tsx` (Leaflet, 160 บรรทัด) | ทิ้ง — แต่เก็บ prop contract `pois/kruak/focus` เป็นต้นแบบ interface ของ diorama |
| `travel-dashboard.tsx` (864 บรรทัด monolith) | **ผ่า** — แยก `ChatPanel` ออกมาก่อน (prerequisite ของทั้ง diorama และ 2-pane) |
| `trip.ts` + Supabase sync | เก็บ schema เดิม — drag-drop เพิ่มแค่ field `order`/`day` |
| kruak PNG + `lib/game/kruak.ts` | เก็บ — กลายเป็น sprite, registry pattern ขยายเป็น sprite manifest |
| leaflet dependency | ถอดเมื่อ diorama แทนครบ (⚠ webcam-map/transit-map ยังใช้ — เช็คก่อนถอด) |

### โครงไฟล์ใหม่ (แนวคิด)
```
lib/stage/                 ← โลก diorama (ไม่รู้จัก React/Pixi — กันไว้ port ได้)
  stage-model.ts           ← state: camera, kruakPos, districts, pins, layers
  geo-anchor.ts            ← map พิกัด geo → พิกัด stage  (⚠ ดูความเสี่ยง #2)
  tokyo.stage.ts           ← layout เมือง (authored data ต่อเมือง)
components/stage/
  diorama-stage.tsx        ← Pixi renderer, subscribe stage-model
  stage-overlay.tsx        ← DOM ลอยเหนือ canvas: card, ป้าย, bubble กร๊วก
```
- **chat-as-router เดิมทำงานต่อได้เลย:** `?tab=map&area=asakusa` เดิมสั่ง Leaflet flyTo → ใหม่สั่ง `stage-model.focusDistrict("asakusa")` = กล้อง tween + กร๊วกเดินไป. contract ระดับ URL ไม่เปลี่ยน
- **Trip = DOM ล้วน** ไม่เข้า canvas. drag-drop ใช้ dnd-kit (การ์ดทริป = "interactive = washi-UI flat" ตาม design law)

### Card ญี่ปุ่น + fli/Rakuten (fail-silent)
**Card = DOM overlay เหนือ canvas, ไม่ render ใน canvas** (design law: interactive=flat washi; + ตัวไทยใน canvas font/a11y พัง).

Contract ใหม่ — **สองช่องทาง**:
```ts
type ChatReply = {
  text: string;                    // เสียงกร๊วก — LLM ผลิต เหมือนเดิม
  cards: Card[];                   // โค้ดผลิต ไม่ใช่ LLM
  stageCommand?: { focusArea?: string; layer?: "stay" | "eat" };
};
```
- **ห้ามให้ LLM emit JSON card.** โค้ดฝั่ง server ประกอบ `cards[]` จาก context เดียวกับที่ส่งเข้า LLM. LLM มีหน้าที่เดียว: พูดไทยอบอุ่น. ผล: (ก) voice กร๊วกไม่พังเพราะบังคับ format, (ข) fail-silent เป็นธรรมชาติ — Rakuten ตาย → ไม่มี stay card + prompt ไม่มีข้อมูล stay → กร๊วกไม่เผลอสัญญาราคา, (ค) card = ข้อมูลจริง 100% ไม่มี hallucination เข้า UI
- **Rakuten:** `lib/services/stays.ts` — **Rakuten Travel API ทางการ + affiliate deep-link** (ห้าม reverse). ตาม signal pattern `{available, items}` ที่ทุก service ใช้. cache TTL ยาว
- **fli (ตั๋ว):** `lib/services/flight-signal.ts` — optional enrichment, cache หนัก, timeout สั้น, ตาย → `available:false` → ไม่มี flight card, deep-link Google Flights แทน. **ห้ามอยู่ใน critical path** — ยิงขนานกับ compose
- `wantsFlights` ใน advisor มีอยู่แล้วแต่ไม่ถูกใช้ (dead flag) → เอามาต่อ flight-signal ตอน Phase 3

---

## Roadmap — มีของจับต้องได้ทุก 1-2 สัปดาห์

### Phase 0 — Card contract (~1 สัปดาห์, ยังไม่มี canvas) · REAL
ผ่า `ChatPanel` ออกจาก `travel-dashboard` + เปลี่ยน `/api/assistant` ให้คืน `ChatReply`
(text+cards) + render card washi ใน DOM แชทปัจจุบัน. **มาก่อนเพราะ:** พิสูจน์ UX card โดยไม่แบก
engine risk, และ ChatPanel ที่แยกแล้วคือ prerequisite ของทุกอย่างถัดไป.

### Phase 1 — Diorama spike, โตเกียวเมืองเดียว (~1.5-2 สัปดาห์) · REAL — "เล็กสุดที่พิสูจน์ทิศ"
Pixi stage: พื้น washi 1 ผืน, 4-5 ย่าน (浅草/渋谷/新宿/上野/谷中), landmark sprite ย่านละ 1,
กร๊วกเดิน (PNG 5 มู้ดเดิม + walk cycle 2-4 เฟรม), กล้อง pan/zoom/flyTo จาก `?area=` deep-link.
- **🚧 GATE ต้องผ่านก่อนไปต่อ: 60fps บน Android กลางตลาดจริง + reload ผ่าน context-lost.**
  ไม่ผ่าน = ทบทวน (ลด resolution/layer) ก่อนลงทุน art

### Phase 2 — Cards ในโลก + Rakuten จริง (~2 สัปดาห์) · Rakuten REAL / ร้าน MOCK
DOM overlay + world→screen projection, stay layer จาก Rakuten API จริง (การ์ดราคา + deep-link จอง),
ร้านอาหาร = mock ก่อน, Trip drag-drop (DOM, จัดลำดับ + จัดวัน).
**⚠ ก่อนเฟสนี้: ย้าย rate-limit/cache ออกจาก in-memory (ดูความเสี่ยง #1)**

### Phase 3 — Flight enrichment + เมืองที่สอง (~2 สัปดาห์) · เสี่ยงสุด
fli fail-silent + **เมืองที่สอง = บททดสอบจริงของ art pipeline** — ถ้าเพิ่มเมืองแล้วต้อง
hand-craft ทุก sprite ใหม่ = pipeline พัง ต้องทำ template (โครงร่วม เปลี่ยนแค่ motif).

### Phase 4 — ตัด Leaflet + polish + งาน v1 spec เดิม
LINE login / during-trip mode / after-trip closure (ตาม PROJECT_MEMORY) — นอก scope รื้อนี้แต่อย่าให้หาย.

---

## ⚠ ระเบิดเงียบที่ต้องกันไว้ก่อน (Fable จับได้)

1. **Rate-limit + `cached()` เป็น in-memory `Map`** (`app/api/assistant/route.ts:19`) — บน serverless
   หลาย instance = rate limit หายเงียบ + cache hit ดิ่ง = บิล LLM/API บาน. **ย้าย Supabase/KV ก่อน Phase 2**
   (Rakuten/fli จะยิ่งพึ่ง cache หนัก)
2. **`geo-anchor.ts` = external-data-keyed map** (standing invariant): POI/area จาก travel-meta มาเป็น
   lat/lon+ชื่อย่าน แต่ stage มีตำแหน่ง authored. **ย่านไม่อยู่ในตาราง → หมุดโผล่มั่ว.** ต้องมี dev
   tripwire (script เช็ค coverage ทุกย่าน vs stage layout, fail ดังๆ) ห้าม default เงียบไปมุมจอ
3. **สัญญา `\n\n` = multi-bubble** อยู่ใน comment แต่ไม่มีอะไรบังคับ LLM — พอเปลี่ยนเป็น ChatReply ให้
   formalize (server split เป็น `bubbles: string[]` ก่อนส่ง client)
4. **asset มือถือบวมง่าย 5-10MB** — บังคับ spritesheet + WebP + lazy-load ราย district **ตั้งแต่ Phase 1**
   (คนไทยเปิดบน roaming/พ็อกเก็ตไวไฟที่ญี่ปุ่น — bandwidth คือ UX)
5. **Latency ฆ่า warmth** — Phase 2-3 จะล่อใจให้รอ Rakuten/fli ก่อนตอบ **ห้าม.** ตอบ text ก่อนเสมอ,
   card เติมทีหลังแบบ second paint, ack bubble ทันที
6. **Art consistency = cost O(เมือง × landmark)** — ก่อนวาดเกิน 1 เมือง ต้องมี sprite manifest +
   style-check ritual (แบบ checklist ใน kruak-image-prompts.md) ไม่งั้น "iso ครึ่งดี ข้าง UI เนี้ยบ = fan mod"
7. **`getCityVerdict` ยิง LLM ใน render path** (revalidate 600s/เมือง) — เมืองเยอะ + crawler = ค่า LLM โต
   เงียบ. ใส่ metric นับ call

---

## หมายเหตุก่อนลงมือ (จาก AGENTS.md)
- **Next.js 15 นี้เป็น fork แก้เอง มี breaking changes** — อ่าน `node_modules/next/dist/docs/` ก่อนเขียนโค้ดทุก Phase
- Fable ยังไม่ได้อ่าน: `fable-nagame-direction.pdf` (เครื่องไม่มี poppler), globals.css token จริง, service รายตัว,
  cache.ts (สรุปว่า in-memory จาก pattern — **verify ก่อนแก้**), /api/trip + Supabase schema, Next fork docs
