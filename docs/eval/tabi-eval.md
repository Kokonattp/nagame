# Tabi agent evaluation

Run: 2026-10-11T10:26:57.024Z · target: `http://localhost:3108` · 23 scenarios (Thai, incl. a 4-turn conversation)

| Metric | Result |
|---|---|
| All checks pass | 23/23 (100%) |
| Right action (suggest / ask / open / draft / flights / answer / chat) | 22/22 (100%) |
| Month understood | 10/10 (100%) |
| Trip length understood | 8/8 (100%) |
| Exact date understood | 1/1 (100%) |
| Constraint kept (region, refine stays local, no price claims …) | 15/15 (100%) |
| Grounded — every suggested place exists in the place store | 23/23 (100%) (94 places checked) |
| Answered by Jev (not keyword fallback) | 23/23 |
| Latency p50 / p95 / max | 477 / 718 / 822 ms |

## Scenarios

| Case | Message | Action | ms | Checks |
|---|---|---|---|---|
| ✅ discover-nature | อยากไปญี่ปุ่น 5 วันกลาง พ.ค. เน้นธรรมชาติ | suggest_routes | 822 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ exact-date | ไป 10 ธ.ค. 5 วัน อยากเห็นหิมะ | suggest_routes | 617 | ✓ action, ✓ month, ✓ days, ✓ date, ✓ grounded |
| ✅ kyoto-autumn | อยากไปเกียวโต ดูใบไม้เปลี่ยนสี พ.ย. 5 วัน | suggest_routes | 652 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ hokkaido-only | ฮอกไกโด ธันวาคม 7 วัน หิมะ ออนเซ็น | suggest_routes | 617 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ family-first | พาลูกไปญี่ปุ่นครั้งแรก เมษา 6 วัน | suggest_routes | 718 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ tateyama | อยากไปทาเตยามะ ดูกำแพงหิมะ พ.ค. | suggest_routes | 606 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ two-weeks | เที่ยว 2 สัปดาห์ ช่วง พ.ย. | suggest_routes | 700 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ no-false-month | พาเด็กคนเล็กไปด้วย 5 วัน | suggest_routes | 618 | ✓ month, ✓ days, ✓ grounded |
| ✅ fukuoka-food | ไปฟุกุโอกะ 4 วัน กินราเมน | suggest_routes | 641 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ okinawa | โอกินาว่า มิถุนา 5 วัน | suggest_routes | 632 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ vague | อยากไปญี่ปุ่น | ask | 341 | ✓ action, ✓ grounded |
| ✅ greeting | สวัสดีทาบิ | chat | 320 | ✓ action, ✓ grounded |
| ✅ booking-refused | ช่วยจองโรงแรมให้หน่อย | chat | 362 | ✓ action, ✓ grounded |
| ✅ flight | ตั๋วไปโอซาก้าเดือนหน้าเท่าไร | flights | 327 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ refine-crowds | มีแบบคนน้อยกว่านี้ไหม | suggest_routes | 608 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ pick-first | อันแรกเลย | open_route | 346 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ draft | จัดเป็นแผนรายวันให้หน่อย | draft_itinerary | 361 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ detail | Mount Fuji คนเยอะไหม | answer | 337 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-visa | คนไทยไปญี่ปุ่นต้องขอวีซ่าไหม | answer | 358 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-sim | ซื้อซิมหรือ esim ที่ไหนดี | answer | 477 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-plug | ปลั๊กไฟญี่ปุ่นใช้แบบไหน ต้องพกหัวแปลงไหม | answer | 335 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-emergency | ถ้าป่วยหรือเกิดเหตุฉุกเฉินต้องโทรเบอร์อะไร | answer | 355 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ detail-thai-name | ฟุชิมิ อินะริ คนเยอะไหม | answer | 360 | ✓ action, ✓ constraint, ✓ grounded |

Latency is measured from this machine, so it includes network time to `http://localhost:3108`.
