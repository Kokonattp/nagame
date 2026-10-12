# Tabi agent evaluation

Run: 2026-10-12T15:36:49.506Z · target: `http://localhost:3207` · 46 scenarios (Thai, incl. a 4-turn conversation)

| Metric | Result |
|---|---|
| All checks pass | 46/46 (100%) |
| Right action (suggest / ask / open / draft / flights / answer / chat) | 45/45 (100%) |
| Month understood | 13/13 (100%) |
| Trip length understood | 13/13 (100%) |
| Exact date understood | 1/1 (100%) |
| Constraint kept (region, refine stays local, no price claims …) | 39/39 (100%) |
| Grounded — every suggested place exists in the place store | 46/46 (100%) (161 places checked) |
| Answered by Jev (not keyword fallback) | 46/46 |
| Latency p50 / p95 / max | 410 / 887 / 932 ms |

## Scenarios

| Case | Message | Action | ms | Checks |
|---|---|---|---|---|
| ✅ discover-nature | อยากไปญี่ปุ่น 5 วันกลาง พ.ค. เน้นธรรมชาติ | suggest_routes | 900 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ exact-date | ไป 10 ธ.ค. 5 วัน อยากเห็นหิมะ | suggest_routes | 779 | ✓ action, ✓ month, ✓ days, ✓ date, ✓ grounded |
| ✅ kyoto-autumn | อยากไปเกียวโต ดูใบไม้เปลี่ยนสี พ.ย. 5 วัน | suggest_routes | 825 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ golden-route | เที่ยวโตเกียว เกียวโต โอซาก้า 7 วัน เดือนพฤศจิกายน ชอบวัดและของกิน | suggest_routes | 778 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ small-city | อยากไปทตโตริ 3 วัน ดูเนินทราย | suggest_routes | 680 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ onsen-town | อยากแช่ออนเซ็นที่คิโนะซากิ 3 วัน เดือนมกรา | suggest_routes | 722 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ two-new-cities | เที่ยวฟุกุโอกะ นางาซากิ 5 วัน | suggest_routes | 393 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ nagoya-not-nago | trip to nagoya 4 days in march | suggest_routes | 693 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ hokkaido-only | ฮอกไกโด ธันวาคม 7 วัน หิมะ ออนเซ็น | suggest_routes | 748 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ family-first | พาลูกไปญี่ปุ่นครั้งแรก เมษา 6 วัน | suggest_routes | 887 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ tateyama | อยากไปทาเตยามะ ดูกำแพงหิมะ พ.ค. | suggest_routes | 694 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ two-weeks | เที่ยว 2 สัปดาห์ ช่วง พ.ย. | suggest_routes | 776 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ no-false-month | พาเด็กคนเล็กไปด้วย 5 วัน | suggest_routes | 691 | ✓ month, ✓ days, ✓ grounded |
| ✅ fukuoka-food | ไปฟุกุโอกะ 4 วัน กินราเมน | suggest_routes | 735 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ okinawa | โอกินาว่า มิถุนา 5 วัน | suggest_routes | 693 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ vague | อยากไปญี่ปุ่น | ask | 570 | ✓ action, ✓ grounded |
| ✅ greeting | สวัสดีทาบิ | chat | 932 | ✓ action, ✓ grounded |
| ✅ booking-refused | ช่วยจองโรงแรมให้หน่อย | answer | 378 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ stay-city | แนะนำที่พักเกียวโตหน่อย | answer | 351 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ stay-ryokan | เรียวกังที่ฮาโกเนะดีๆ | answer | 360 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ stay-cheap | ที่พักถูกๆแถวชินจูกุ | answer | 390 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ sights-city | ที่เที่ยวเกียวโตมีอะไรบ้าง | answer | 372 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ sights-region | ฮอกไกโดมีที่เที่ยวอะไรบ้าง | answer | 373 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ sights-with-days | เที่ยวเกียวโต 5 วัน ไปไหนดี | suggest_routes | 668 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ shop-spelling | แหล่งช็อปปิ้งโอซาก้า | answer | 404 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ city-spelling | ของฝากคานาซาวะ | answer | 330 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ island-zamami | ไปเกาะซามามิ 3 วัน | suggest_routes | 635 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ stay-tip-airport | ที่พักเกาะมิยาโกะ | answer | 355 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ nagoya-spelling | อิเสะ นาโงย่า 3 วัน | suggest_routes | 629 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ place-thai-spelling | คินคาคุจิคนเยอะไหม | answer | 357 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ district-in-name | ที่พักแถวคิโนะซากิออนเซ็น | answer | 362 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ food-no-guide | ร้านอาหารแถวคิโนะซากิออนเซ็น | answer | 363 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ stay-no-guide | ที่พักที่คิโนะซากิ | answer | 381 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ weather-snow | ซัปโปโร ธ.ค. หิมะตกไหม | answer | 374 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ food-district | ร้านราเมนแถวชินจูกุแนะนำหน่อย | answer | 368 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ off-topic-honest | ใครชนะฟุตบอลเมื่อคืน | chat | 379 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ flight | ตั๋วไปโอซาก้าเดือนหน้าเท่าไร | flights | 388 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ refine-crowds | มีแบบคนน้อยกว่านี้ไหม | suggest_routes | 803 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ pick-first | อันแรกเลย | open_route | 373 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ draft | จัดเป็นแผนรายวันให้หน่อย | draft_itinerary | 379 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ detail | Mount Fuji คนเยอะไหม | answer | 398 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-visa | คนไทยไปญี่ปุ่นต้องขอวีซ่าไหม | answer | 390 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-sim | ซื้อซิมหรือ esim ที่ไหนดี | answer | 410 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-plug | ปลั๊กไฟญี่ปุ่นใช้แบบไหน ต้องพกหัวแปลงไหม | answer | 463 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-emergency | ถ้าป่วยหรือเกิดเหตุฉุกเฉินต้องโทรเบอร์อะไร | answer | 403 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ detail-thai-name | ฟุชิมิ อินะริ คนเยอะไหม | answer | 421 | ✓ action, ✓ constraint, ✓ grounded |

Latency is measured from this machine, so it includes network time to `http://localhost:3207`.
