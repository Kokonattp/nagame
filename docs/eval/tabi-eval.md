# Tabi agent evaluation

Run: 2026-10-12T04:12:59.973Z · target: `http://localhost:3123` · 31 scenarios (Thai, incl. a 4-turn conversation)

| Metric | Result |
|---|---|
| All checks pass | 30/30 (100%) |
| Right action (suggest / ask / open / draft / flights / answer / chat) | 29/29 (100%) |
| Month understood | 12/12 (100%) |
| Trip length understood | 10/10 (100%) |
| Exact date understood | – |
| Constraint kept (region, refine stays local, no price claims …) | 24/24 (100%) |
| Grounded — every suggested place exists in the place store | 30/30 (100%) (129 places checked) |
| Answered by Jev (not keyword fallback) | 29/30 |
| Latency p50 / p95 / max | 660 / 3537 / 5029 ms |

## Scenarios

| Case | Message | Action | ms | Checks |
|---|---|---|---|---|
| ✅ discover-nature | อยากไปญี่ปุ่น 5 วันกลาง พ.ค. เน้นธรรมชาติ | suggest_routes | 835 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ⚠️ exact-date | – | – | – | คุยถี่ไปนิด รอสักครู่แล้วลองใหม่นะ |
| ✅ kyoto-autumn | อยากไปเกียวโต ดูใบไม้เปลี่ยนสี พ.ย. 5 วัน | suggest_routes | 932 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ golden-route | เที่ยวโตเกียว เกียวโต โอซาก้า 7 วัน เดือนพฤศจิกายน ชอบวัดและของกิน | suggest_routes | 665 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ small-city | อยากไปทตโตริ 3 วัน ดูเนินทราย | suggest_routes | 660 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ onsen-town | อยากแช่ออนเซ็นที่คิโนะซากิ 3 วัน เดือนมกรา | suggest_routes | 661 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ two-new-cities | เที่ยวฟุกุโอกะ นางาซากิ 5 วัน | suggest_routes | 387 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ nagoya-not-nago | trip to nagoya 4 days in march | suggest_routes | 686 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ hokkaido-only | ฮอกไกโด ธันวาคม 7 วัน หิมะ ออนเซ็น | suggest_routes | 686 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ family-first | พาลูกไปญี่ปุ่นครั้งแรก เมษา 6 วัน | suggest_routes | 711 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ tateyama | อยากไปทาเตยามะ ดูกำแพงหิมะ พ.ค. | suggest_routes | 804 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ two-weeks | เที่ยว 2 สัปดาห์ ช่วง พ.ย. | suggest_routes | 730 | ✓ action, ✓ month, ✓ days, ✓ grounded |
| ✅ no-false-month | พาเด็กคนเล็กไปด้วย 5 วัน | suggest_routes | 669 | ✓ month, ✓ days, ✓ grounded |
| ✅ fukuoka-food | ไปฟุกุโอกะ 4 วัน กินราเมน | suggest_routes | 691 | ✓ action, ✓ days, ✓ constraint, ✓ grounded |
| ✅ okinawa | โอกินาว่า มิถุนา 5 วัน | suggest_routes | 642 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ vague | อยากไปญี่ปุ่น | ask | 433 | ✓ action, ✓ grounded |
| ✅ greeting | สวัสดีทาบิ | chat | 393 | ✓ action, ✓ grounded |
| ✅ booking-refused | ช่วยจองโรงแรมให้หน่อย | chat | 348 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ weather-snow | ซัปโปโร ธ.ค. หิมะตกไหม | answer | 344 | ✓ action, ✓ month, ✓ constraint, ✓ grounded |
| ✅ food-district | ร้านราเมนแถวชินจูกุแนะนำหน่อย | answer | 372 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ off-topic-honest | ใครชนะฟุตบอลเมื่อคืน | chat | 401 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ flight | ตั๋วไปโอซาก้าเดือนหน้าเท่าไร | flights | 430 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ refine-crowds | มีแบบคนน้อยกว่านี้ไหม | suggest_routes | 776 | ✓ action, ✓ month, ✓ days, ✓ constraint, ✓ grounded |
| ✅ pick-first | อันแรกเลย | open_route | 368 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ draft | จัดเป็นแผนรายวันให้หน่อย | draft_itinerary | 3537 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ detail | Mount Fuji คนเยอะไหม | answer | 436 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-visa | คนไทยไปญี่ปุ่นต้องขอวีซ่าไหม | answer | 347 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-sim | ซื้อซิมหรือ esim ที่ไหนดี | answer | 401 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-plug | ปลั๊กไฟญี่ปุ่นใช้แบบไหน ต้องพกหัวแปลงไหม | answer | 5029 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ faq-emergency | ถ้าป่วยหรือเกิดเหตุฉุกเฉินต้องโทรเบอร์อะไร | answer | 402 | ✓ action, ✓ constraint, ✓ grounded |
| ✅ detail-thai-name | ฟุชิมิ อินะริ คนเยอะไหม | answer | 415 | ✓ action, ✓ constraint, ✓ grounded |

Latency is measured from this machine, so it includes network time to `http://localhost:3123`.
