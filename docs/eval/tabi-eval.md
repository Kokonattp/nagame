# Tabi agent evaluation

Run: 2026-10-10T13:10:39.442Z · target: `https://nagame.vercel.app` · 18 scenarios (Thai, incl. a 4-turn conversation)

| Metric | Result |
|---|---|
| All checks pass | 18/18 (100%) |
| Right action (suggest / ask / open / draft / flights / answer / chat) | 17/17 (100%) |
| Month understood | 10/10 (100%) |
| Trip length understood | 8/8 (100%) |
| Exact date understood | 1/1 (100%) |
| Constraint kept (region, refine stays local, no price claims …) | 10/10 (100%) |
| Grounded — every suggested place exists in the place store | 18/18 (100%) (73 places checked) |
| Answered by Jev (not keyword fallback) | 18/18 |
| Latency p50 / p95 / max | 566 / 772 / 772 ms |

## Scenarios

| Case | Message | Action | ms | Checks |
|---|---|---|---|---|
| ✅ discover-nature | อยากไปญี่ปุ่น 5 วันกลาง พ.ค. เน้นธรรมชาติ | suggest_routes | 772 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ exact-date | ไป 10 ธ.ค. 5 วัน อยากเห็นหิมะ | suggest_routes | 710 | ✓ action, ✓ month, ✓ days, ✓ date, ✓ grounded |
| ✅ kyoto-autumn | อยากไปเกียวโต ดูใบไม้เปลี่ยนสี พ.ย. 5 วัน | suggest_routes | 504 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ hokkaido-only | ฮอกไกโด ธันวาคม 7 วัน หิมะ ออนเซ็น | suggest_routes | 566 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ family-first | พาลูกไปญี่ปุ่นครั้งแรก เมษา 6 วัน | suggest_routes | 681 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ tateyama | อยากไปทาเตยามะ ดูกำแพงหิมะ พ.ค. | suggest_routes | 525 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ two-weeks | เที่ยว 2 สัปดาห์ ช่วง พ.ย. | suggest_routes | 686 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ no-false-month | พาเด็กคนเล็กไปด้วย 5 วัน | suggest_routes | 674 | ✓ month, ✓ days, ✓ grounded |
| ✅ fukuoka-food | ไปฟุกุโอกะ 4 วัน กินราเมน | suggest_routes | 528 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ okinawa | โอกินาว่า มิถุนา 5 วัน | suggest_routes | 630 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ vague | อยากไปญี่ปุ่น | ask | 569 | ✓ action, ✓ grounded |
| ✅ greeting | สวัสดีทาบิ | chat | 503 | ✓ action, ✓ grounded |
| ✅ booking-refused | ช่วยจองโรงแรมให้หน่อย | chat | 507 | ✓ action, ✓ grounded |
| ✅ flight | ตั๋วไปโอซาก้าเดือนหน้าเท่าไร | flights | 561 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ refine-crowds | มีแบบคนน้อยกว่านี้ไหม | suggest_routes | 645 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ pick-first | อันแรกเลย | open_route | 495 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ draft | จัดเป็นแผนรายวันให้หน่อย | draft_itinerary | 524 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ detail | Mount Fuji คนเยอะไหม | answer | 532 | ✓ action, ✓ constraint, ✓ grounded |

Latency is measured from this machine, so it includes network time to `https://nagame.vercel.app`.
