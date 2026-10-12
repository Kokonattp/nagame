# Tabi agent evaluation

Run: 2026-10-12T06:46:03.872Z · target: `http://localhost:3207` · 40 scenarios (Thai, incl. a 4-turn conversation)

| Metric | Result |
|---|---|
| All checks pass | 40/40 (100%) |
| Right action (suggest / ask / open / draft / flights / answer / chat) | 39/39 (100%) |
| Month understood | 13/13 (100%) |
| Trip length understood | 12/12 (100%) |
| Exact date understood | 1/1 (100%) |
| Constraint kept (region, refine stays local, no price claims …) | 33/33 (100%) |
| Grounded — every suggested place exists in the place store | 40/40 (100%) (146 places checked) |
| Answered by Jev (not keyword fallback) | 40/40 |
| Latency p50 / p95 / max | 568 / 1262 / 2616 ms |

## Scenarios

| Case | Message | Action | ms | Checks |
|---|---|---|---|---|
| ✅ discover-nature | อยากไปญี่ปุ่น 5 วันกลาง พ.ค. เน้นธรรมชาติ | suggest_routes | 981 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ exact-date | ไป 10 ธ.ค. 5 วัน อยากเห็นหิมะ | suggest_routes | 905 | ✓ action, ✓ month, ✓ days, ✓ date, ✓ grounded |
| ✅ kyoto-autumn | อยากไปเกียวโต ดูใบไม้เปลี่ยนสี พ.ย. 5 วัน | suggest_routes | 823 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ golden-route | เที่ยวโตเกียว เกียวโต โอซาก้า 7 วัน เดือนพฤศจิกายน ชอบวัดและของกิน | suggest_routes | 797 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ small-city | อยากไปทตโตริ 3 วัน ดูเนินทราย | suggest_routes | 829 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ onsen-town | อยากแช่ออนเซ็นที่คิโนะซากิ 3 วัน เดือนมกรา | suggest_routes | 801 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ two-new-cities | เที่ยวฟุกุโอกะ นางาซากิ 5 วัน | suggest_routes | 644 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ nagoya-not-nago | trip to nagoya 4 days in march | suggest_routes | 2616 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ hokkaido-only | ฮอกไกโด ธันวาคม 7 วัน หิมะ ออนเซ็น | suggest_routes | 901 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ family-first | พาลูกไปญี่ปุ่นครั้งแรก เมษา 6 วัน | suggest_routes | 989 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ tateyama | อยากไปทาเตยามะ ดูกำแพงหิมะ พ.ค. | suggest_routes | 1026 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ two-weeks | เที่ยว 2 สัปดาห์ ช่วง พ.ย. | suggest_routes | 1008 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ no-false-month | พาเด็กคนเล็กไปด้วย 5 วัน | suggest_routes | 878 | ✓ month, ✓ days, ✓ grounded |
| ✅ fukuoka-food | ไปฟุกุโอกะ 4 วัน กินราเมน | suggest_routes | 856 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ okinawa | โอกินาว่า มิถุนา 5 วัน | suggest_routes | 762 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ vague | อยากไปญี่ปุ่น | ask | 474 | ✓ action, ✓ grounded |
| ✅ greeting | สวัสดีทาบิ | chat | 472 | ✓ action, ✓ grounded |
| ✅ booking-refused | ช่วยจองโรงแรมให้หน่อย | answer | 468 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ stay-city | แนะนำที่พักเกียวโตหน่อย | answer | 554 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ stay-ryokan | เรียวกังที่ฮาโกเนะดีๆ | answer | 490 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ stay-cheap | ที่พักถูกๆแถวชินจูกุ | answer | 483 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ sights-city | ที่เที่ยวเกียวโตมีอะไรบ้าง | answer | 579 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ sights-region | ฮอกไกโดมีที่เที่ยวอะไรบ้าง | answer | 477 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ sights-with-days | เที่ยวเกียวโต 5 วัน ไปไหนดี | suggest_routes | 937 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ shop-spelling | แหล่งช็อปปิ้งโอซาก้า | answer | 1262 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ city-spelling | ของฝากคานาซาวะ | answer | 548 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ stay-no-guide | ที่พักที่คิโนะซากิ | answer | 472 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ weather-snow | ซัปโปโร ธ.ค. หิมะตกไหม | answer | 485 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ food-district | ร้านราเมนแถวชินจูกุแนะนำหน่อย | answer | 442 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ off-topic-honest | ใครชนะฟุตบอลเมื่อคืน | chat | 458 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ flight | ตั๋วไปโอซาก้าเดือนหน้าเท่าไร | flights | 468 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ refine-crowds | มีแบบคนน้อยกว่านี้ไหม | suggest_routes | 988 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ pick-first | อันแรกเลย | open_route | 474 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ draft | จัดเป็นแผนรายวันให้หน่อย | draft_itinerary | 482 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ detail | Mount Fuji คนเยอะไหม | answer | 502 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-visa | คนไทยไปญี่ปุ่นต้องขอวีซ่าไหม | answer | 489 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-sim | ซื้อซิมหรือ esim ที่ไหนดี | answer | 511 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-plug | ปลั๊กไฟญี่ปุ่นใช้แบบไหน ต้องพกหัวแปลงไหม | answer | 558 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-emergency | ถ้าป่วยหรือเกิดเหตุฉุกเฉินต้องโทรเบอร์อะไร | answer | 568 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ detail-thai-name | ฟุชิมิ อินะริ คนเยอะไหม | answer | 504 | ✓ action, ✓ constraint, ✓ grounded |

Latency is measured from this machine, so it includes network time to `http://localhost:3207`.
