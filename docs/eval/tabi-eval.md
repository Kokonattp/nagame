# Tabi agent evaluation

Run: 2026-10-12T02:02:11.602Z · target: `http://localhost:3121` · 24 scenarios (Thai, incl. a 4-turn conversation)

| Metric | Result |
|---|---|
| All checks pass | 24/24 (100%) |
| Right action (suggest / ask / open / draft / flights / answer / chat) | 23/23 (100%) |
| Month understood | 11/11 (100%) |
| Trip length understood | 9/9 (100%) |
| Exact date understood | 1/1 (100%) |
| Constraint kept (region, refine stays local, no price claims …) | 16/16 (100%) |
| Grounded — every suggested place exists in the place store | 24/24 (100%) (102 places checked) |
| Answered by Jev (not keyword fallback) | 24/24 |
| Latency p50 / p95 / max | 639 / 774 / 1708 ms |

## Scenarios

| Case | Message | Action | ms | Checks |
|---|---|---|---|---|
| ✅ discover-nature | อยากไปญี่ปุ่น 5 วันกลาง พ.ค. เน้นธรรมชาติ | suggest_routes | 1708 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ exact-date | ไป 10 ธ.ค. 5 วัน อยากเห็นหิมะ | suggest_routes | 721 | ✓ action, ✓ month, ✓ days, ✓ date, ✓ grounded |
| ✅ kyoto-autumn | อยากไปเกียวโต ดูใบไม้เปลี่ยนสี พ.ย. 5 วัน | suggest_routes | 641 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ golden-route | เที่ยวโตเกียว เกียวโต โอซาก้า 7 วัน เดือนพฤศจิกายน ชอบวัดและของกิน | suggest_routes | 713 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ hokkaido-only | ฮอกไกโด ธันวาคม 7 วัน หิมะ ออนเซ็น | suggest_routes | 726 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ family-first | พาลูกไปญี่ปุ่นครั้งแรก เมษา 6 วัน | suggest_routes | 738 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ tateyama | อยากไปทาเตยามะ ดูกำแพงหิมะ พ.ค. | suggest_routes | 639 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ two-weeks | เที่ยว 2 สัปดาห์ ช่วง พ.ย. | suggest_routes | 774 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ no-false-month | พาเด็กคนเล็กไปด้วย 5 วัน | suggest_routes | 700 | ✓ month, ✓ days, ✓ grounded |
| ✅ fukuoka-food | ไปฟุกุโอกะ 4 วัน กินราเมน | suggest_routes | 695 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ okinawa | โอกินาว่า มิถุนา 5 วัน | suggest_routes | 664 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ vague | อยากไปญี่ปุ่น | ask | 400 | ✓ action, ✓ grounded |
| ✅ greeting | สวัสดีทาบิ | chat | 410 | ✓ action, ✓ grounded |
| ✅ booking-refused | ช่วยจองโรงแรมให้หน่อย | chat | 407 | ✓ action, ✓ grounded |
| ✅ flight | ตั๋วไปโอซาก้าเดือนหน้าเท่าไร | flights | 376 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ refine-crowds | มีแบบคนน้อยกว่านี้ไหม | suggest_routes | 675 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ pick-first | อันแรกเลย | open_route | 352 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ draft | จัดเป็นแผนรายวันให้หน่อย | draft_itinerary | 375 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ detail | Mount Fuji คนเยอะไหม | answer | 381 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-visa | คนไทยไปญี่ปุ่นต้องขอวีซ่าไหม | answer | 404 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-sim | ซื้อซิมหรือ esim ที่ไหนดี | answer | 366 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-plug | ปลั๊กไฟญี่ปุ่นใช้แบบไหน ต้องพกหัวแปลงไหม | answer | 370 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-emergency | ถ้าป่วยหรือเกิดเหตุฉุกเฉินต้องโทรเบอร์อะไร | answer | 374 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ detail-thai-name | ฟุชิมิ อินะริ คนเยอะไหม | answer | 397 | ✓ action, ✓ constraint, ✓ grounded |

Latency is measured from this machine, so it includes network time to `http://localhost:3121`.
