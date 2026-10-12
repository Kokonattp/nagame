# Tabi agent evaluation

Run: 2026-10-12T06:33:09.994Z · target: `http://localhost:3207` · 40 scenarios (Thai, incl. a 4-turn conversation)

| Metric | Result |
|---|---|
| All checks pass | 40/40 (100%) |
| Right action (suggest / ask / open / draft / flights / answer / chat) | 39/39 (100%) |
| Month understood | 13/13 (100%) |
| Trip length understood | 12/12 (100%) |
| Exact date understood | 1/1 (100%) |
| Constraint kept (region, refine stays local, no price claims …) | 33/33 (100%) |
| Grounded — every suggested place exists in the place store | 40/40 (100%) (148 places checked) |
| Answered by Jev (not keyword fallback) | 39/40 |
| Latency p50 / p95 / max | 660 / 2955 / 5039 ms |

## Scenarios

| Case | Message | Action | ms | Checks |
|---|---|---|---|---|
| ✅ discover-nature | อยากไปญี่ปุ่น 5 วันกลาง พ.ค. เน้นธรรมชาติ | suggest_routes | 1173 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ exact-date | ไป 10 ธ.ค. 5 วัน อยากเห็นหิมะ | suggest_routes | 852 | ✓ action, ✓ month, ✓ days, ✓ date, ✓ grounded |
| ✅ kyoto-autumn | อยากไปเกียวโต ดูใบไม้เปลี่ยนสี พ.ย. 5 วัน | suggest_routes | 786 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ golden-route | เที่ยวโตเกียว เกียวโต โอซาก้า 7 วัน เดือนพฤศจิกายน ชอบวัดและของกิน | suggest_routes | 872 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ small-city | อยากไปทตโตริ 3 วัน ดูเนินทราย | suggest_routes | 761 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ onsen-town | อยากแช่ออนเซ็นที่คิโนะซากิ 3 วัน เดือนมกรา | suggest_routes | 724 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ two-new-cities | เที่ยวฟุกุโอกะ นางาซากิ 5 วัน | suggest_routes | 493 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ nagoya-not-nago | trip to nagoya 4 days in march | suggest_routes | 772 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ hokkaido-only | ฮอกไกโด ธันวาคม 7 วัน หิมะ ออนเซ็น | suggest_routes | 917 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ family-first | พาลูกไปญี่ปุ่นครั้งแรก เมษา 6 วัน | suggest_routes | 870 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ tateyama | อยากไปทาเตยามะ ดูกำแพงหิมะ พ.ค. | suggest_routes | 849 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ two-weeks | เที่ยว 2 สัปดาห์ ช่วง พ.ย. | suggest_routes | 953 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ no-false-month | พาเด็กคนเล็กไปด้วย 5 วัน | suggest_routes | 930 | ✓ month, ✓ days, ✓ grounded |
| ✅ fukuoka-food | ไปฟุกุโอกะ 4 วัน กินราเมน | suggest_routes | 753 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ okinawa | โอกินาว่า มิถุนา 5 วัน | suggest_routes | 2955 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ vague | อยากไปญี่ปุ่น | ask | 1235 | ✓ action, ✓ grounded |
| ✅ greeting | สวัสดีทาบิ | chat | 479 | ✓ action, ✓ grounded |
| ✅ booking-refused | ช่วยจองโรงแรมให้หน่อย | answer | 458 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ stay-city | แนะนำที่พักเกียวโตหน่อย | answer | 478 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ stay-ryokan | เรียวกังที่ฮาโกเนะดีๆ | answer | 450 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ stay-cheap | ที่พักถูกๆแถวชินจูกุ | answer | 516 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ sights-city | ที่เที่ยวเกียวโตมีอะไรบ้าง | answer | 456 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ sights-region | ฮอกไกโดมีที่เที่ยวอะไรบ้าง | answer | 660 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ sights-with-days | เที่ยวเกียวโต 5 วัน ไปไหนดี | suggest_routes | 800 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ shop-spelling | แหล่งช็อปปิ้งโอซาก้า | answer | 468 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ city-spelling | ของฝากคานาซาวะ | answer | 495 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ stay-no-guide | ที่พักที่คิโนะซากิ | answer | 5039 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ weather-snow | ซัปโปโร ธ.ค. หิมะตกไหม | answer | 454 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ food-district | ร้านราเมนแถวชินจูกุแนะนำหน่อย | answer | 477 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ off-topic-honest | ใครชนะฟุตบอลเมื่อคืน | chat | 483 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ flight | ตั๋วไปโอซาก้าเดือนหน้าเท่าไร | flights | 496 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ refine-crowds | มีแบบคนน้อยกว่านี้ไหม | suggest_routes | 818 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ pick-first | อันแรกเลย | open_route | 456 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ draft | จัดเป็นแผนรายวันให้หน่อย | draft_itinerary | 2305 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ detail | Mount Fuji คนเยอะไหม | answer | 453 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-visa | คนไทยไปญี่ปุ่นต้องขอวีซ่าไหม | answer | 468 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-sim | ซื้อซิมหรือ esim ที่ไหนดี | answer | 401 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-plug | ปลั๊กไฟญี่ปุ่นใช้แบบไหน ต้องพกหัวแปลงไหม | answer | 488 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-emergency | ถ้าป่วยหรือเกิดเหตุฉุกเฉินต้องโทรเบอร์อะไร | answer | 429 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ detail-thai-name | ฟุชิมิ อินะริ คนเยอะไหม | answer | 441 | ✓ action, ✓ constraint, ✓ grounded |

Latency is measured from this machine, so it includes network time to `http://localhost:3207`.
