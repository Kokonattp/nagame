# Tabi agent evaluation

Run: 2026-10-12T10:14:38.687Z · target: `http://localhost:3207` · 43 scenarios (Thai, incl. a 4-turn conversation)

| Metric | Result |
|---|---|
| All checks pass | 42/43 (98%) |
| Right action (suggest / ask / open / draft / flights / answer / chat) | 41/42 (98%) |
| Month understood | 13/13 (100%) |
| Trip length understood | 13/13 (100%) |
| Exact date understood | 1/1 (100%) |
| Constraint kept (region, refine stays local, no price claims …) | 35/36 (97%) |
| Grounded — every suggested place exists in the place store | 43/43 (100%) (161 places checked) |
| Answered by Jev (not keyword fallback) | 40/43 |
| Latency p50 / p95 / max | 964 / 5033 / 5037 ms |

## Scenarios

| Case | Message | Action | ms | Checks |
|---|---|---|---|---|
| ✅ discover-nature | อยากไปญี่ปุ่น 5 วันกลาง พ.ค. เน้นธรรมชาติ | suggest_routes | 1065 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ exact-date | ไป 10 ธ.ค. 5 วัน อยากเห็นหิมะ | suggest_routes | 1013 | ✓ action, ✓ month, ✓ days, ✓ date, ✓ grounded |
| ✅ kyoto-autumn | อยากไปเกียวโต ดูใบไม้เปลี่ยนสี พ.ย. 5 วัน | suggest_routes | 1003 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ golden-route | เที่ยวโตเกียว เกียวโต โอซาก้า 7 วัน เดือนพฤศจิกายน ชอบวัดและของกิน | suggest_routes | 799 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ small-city | อยากไปทตโตริ 3 วัน ดูเนินทราย | suggest_routes | 827 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ onsen-town | อยากแช่ออนเซ็นที่คิโนะซากิ 3 วัน เดือนมกรา | suggest_routes | 810 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ two-new-cities | เที่ยวฟุกุโอกะ นางาซากิ 5 วัน | suggest_routes | 484 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ nagoya-not-nago | trip to nagoya 4 days in march | suggest_routes | 841 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ hokkaido-only | ฮอกไกโด ธันวาคม 7 วัน หิมะ ออนเซ็น | suggest_routes | 3316 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ family-first | พาลูกไปญี่ปุ่นครั้งแรก เมษา 6 วัน | suggest_routes | 4494 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ tateyama | อยากไปทาเตยามะ ดูกำแพงหิมะ พ.ค. | suggest_routes | 782 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ two-weeks | เที่ยว 2 สัปดาห์ ช่วง พ.ย. | suggest_routes | 888 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ no-false-month | พาเด็กคนเล็กไปด้วย 5 วัน | suggest_routes | 1166 | ✓ month, ✓ days, ✓ grounded |
| ✅ fukuoka-food | ไปฟุกุโอกะ 4 วัน กินราเมน | suggest_routes | 1344 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ okinawa | โอกินาว่า มิถุนา 5 วัน | suggest_routes | 3487 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ vague | อยากไปญี่ปุ่น | ask | 695 | ✓ action, ✓ grounded |
| ✅ greeting | สวัสดีทาบิ | chat | 1220 | ✓ action, ✓ grounded |
| ✅ booking-refused | ช่วยจองโรงแรมให้หน่อย | answer | 3530 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ stay-city | แนะนำที่พักเกียวโตหน่อย | answer | 650 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ stay-ryokan | เรียวกังที่ฮาโกเนะดีๆ | answer | 698 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ stay-cheap | ที่พักถูกๆแถวชินจูกุ | answer | 526 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ sights-city | ที่เที่ยวเกียวโตมีอะไรบ้าง | answer | 488 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ sights-region | ฮอกไกโดมีที่เที่ยวอะไรบ้าง | answer | 5034 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ sights-with-days | เที่ยวเกียวโต 5 วัน ไปไหนดี | suggest_routes | 964 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ shop-spelling | แหล่งช็อปปิ้งโอซาก้า | answer | 3173 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ city-spelling | ของฝากคานาซาวะ | answer | 1354 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ island-zamami | ไปเกาะซามามิ 3 วัน | suggest_routes | 4439 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ stay-tip-airport | ที่พักเกาะมิยาโกะ | answer | 548 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ nagoya-spelling | อิเสะ นาโงย่า 3 วัน | suggest_routes | 1085 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ stay-no-guide | ที่พักที่คิโนะซากิ | answer | 446 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ weather-snow | ซัปโปโร ธ.ค. หิมะตกไหม | answer | 569 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ food-district | ร้านราเมนแถวชินจูกุแนะนำหน่อย | answer | 505 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ off-topic-honest | ใครชนะฟุตบอลเมื่อคืน | chat | 1755 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ flight | ตั๋วไปโอซาก้าเดือนหน้าเท่าไร | flights | 4345 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ refine-crowds | มีแบบคนน้อยกว่านี้ไหม | suggest_routes | 1860 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ pick-first | อันแรกเลย | open_route | 455 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ draft | จัดเป็นแผนรายวันให้หน่อย | draft_itinerary | 571 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ detail | Mount Fuji คนเยอะไหม | answer | 510 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-visa | คนไทยไปญี่ปุ่นต้องขอวีซ่าไหม | answer | 541 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-sim | ซื้อซิมหรือ esim ที่ไหนดี | answer | 453 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-plug | ปลั๊กไฟญี่ปุ่นใช้แบบไหน ต้องพกหัวแปลงไหม | answer | 5037 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-emergency | ถ้าป่วยหรือเกิดเหตุฉุกเฉินต้องโทรเบอร์อะไร | answer | 2092 | ✓ action, ✓ constraint, ✓ grounded |
| ❌ detail-thai-name | ฟุชิมิ อินะริ คนเยอะไหม | ask | 5033 | ✗ action, ✗ constraint, ✓ grounded |

Latency is measured from this machine, so it includes network time to `http://localhost:3207`.
