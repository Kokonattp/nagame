# Tabi agent evaluation

Run: 2026-10-12T15:47:53.437Z · target: `http://localhost:3207` · 46 scenarios (Thai, incl. a 4-turn conversation)

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
| Latency p50 / p95 / max | 423 / 861 / 1095 ms |

## Scenarios

| Case | Message | Action | ms | Checks |
|---|---|---|---|---|
| ✅ discover-nature | อยากไปญี่ปุ่น 5 วันกลาง พ.ค. เน้นธรรมชาติ | suggest_routes | 1095 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ exact-date | ไป 10 ธ.ค. 5 วัน อยากเห็นหิมะ | suggest_routes | 838 | ✓ action, ✓ month, ✓ days, ✓ date, ✓ grounded |
| ✅ kyoto-autumn | อยากไปเกียวโต ดูใบไม้เปลี่ยนสี พ.ย. 5 วัน | suggest_routes | 752 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ golden-route | เที่ยวโตเกียว เกียวโต โอซาก้า 7 วัน เดือนพฤศจิกายน ชอบวัดและของกิน | suggest_routes | 689 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ small-city | อยากไปทตโตริ 3 วัน ดูเนินทราย | suggest_routes | 662 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ onsen-town | อยากแช่ออนเซ็นที่คิโนะซากิ 3 วัน เดือนมกรา | suggest_routes | 677 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ two-new-cities | เที่ยวฟุกุโอกะ นางาซากิ 5 วัน | suggest_routes | 337 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ nagoya-not-nago | trip to nagoya 4 days in march | suggest_routes | 680 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ hokkaido-only | ฮอกไกโด ธันวาคม 7 วัน หิมะ ออนเซ็น | suggest_routes | 773 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ family-first | พาลูกไปญี่ปุ่นครั้งแรก เมษา 6 วัน | suggest_routes | 861 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ tateyama | อยากไปทาเตยามะ ดูกำแพงหิมะ พ.ค. | suggest_routes | 634 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ two-weeks | เที่ยว 2 สัปดาห์ ช่วง พ.ย. | suggest_routes | 809 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ no-false-month | พาเด็กคนเล็กไปด้วย 5 วัน | suggest_routes | 741 | ✓ month, ✓ days, ✓ grounded |
| ✅ fukuoka-food | ไปฟุกุโอกะ 4 วัน กินราเมน | suggest_routes | 643 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ okinawa | โอกินาว่า มิถุนา 5 วัน | suggest_routes | 648 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ vague | อยากไปญี่ปุ่น | ask | 381 | ✓ action, ✓ grounded |
| ✅ greeting | สวัสดีทาบิ | chat | 962 | ✓ action, ✓ grounded |
| ✅ booking-refused | ช่วยจองโรงแรมให้หน่อย | answer | 391 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ stay-city | แนะนำที่พักเกียวโตหน่อย | answer | 401 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ stay-ryokan | เรียวกังที่ฮาโกเนะดีๆ | answer | 370 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ stay-cheap | ที่พักถูกๆแถวชินจูกุ | answer | 355 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ sights-city | ที่เที่ยวเกียวโตมีอะไรบ้าง | answer | 348 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ sights-region | ฮอกไกโดมีที่เที่ยวอะไรบ้าง | answer | 351 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ sights-with-days | เที่ยวเกียวโต 5 วัน ไปไหนดี | suggest_routes | 656 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ shop-spelling | แหล่งช็อปปิ้งโอซาก้า | answer | 345 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ city-spelling | ของฝากคานาซาวะ | answer | 369 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ island-zamami | ไปเกาะซามามิ 3 วัน | suggest_routes | 620 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ stay-tip-airport | ที่พักเกาะมิยาโกะ | answer | 347 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ nagoya-spelling | อิเสะ นาโงย่า 3 วัน | suggest_routes | 652 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ place-thai-spelling | คินคาคุจิคนเยอะไหม | answer | 392 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ district-in-name | ที่พักแถวคิโนะซากิออนเซ็น | answer | 326 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ food-no-guide | ร้านอาหารแถวคิโนะซากิออนเซ็น | answer | 336 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ stay-no-guide | ที่พักที่คิโนะซากิ | answer | 368 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ weather-snow | ซัปโปโร ธ.ค. หิมะตกไหม | answer | 367 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ food-district | ร้านราเมนแถวชินจูกุแนะนำหน่อย | answer | 408 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ off-topic-honest | ใครชนะฟุตบอลเมื่อคืน | chat | 423 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ flight | ตั๋วไปโอซาก้าเดือนหน้าเท่าไร | flights | 407 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ refine-crowds | มีแบบคนน้อยกว่านี้ไหม | suggest_routes | 712 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ pick-first | อันแรกเลย | open_route | 335 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ draft | จัดเป็นแผนรายวันให้หน่อย | draft_itinerary | 373 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ detail | Mount Fuji คนเยอะไหม | answer | 370 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-visa | คนไทยไปญี่ปุ่นต้องขอวีซ่าไหม | answer | 702 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-sim | ซื้อซิมหรือ esim ที่ไหนดี | answer | 347 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-plug | ปลั๊กไฟญี่ปุ่นใช้แบบไหน ต้องพกหัวแปลงไหม | answer | 528 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-emergency | ถ้าป่วยหรือเกิดเหตุฉุกเฉินต้องโทรเบอร์อะไร | answer | 390 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ detail-thai-name | ฟุชิมิ อินะริ คนเยอะไหม | answer | 428 | ✓ action, ✓ constraint, ✓ grounded |

Latency is measured from this machine, so it includes network time to `http://localhost:3207`.
