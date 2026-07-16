export type SeasonKind = "bloom" | "foliage" | "snow" | "event";

export type SeasonHighlight = {
  name: string;
  kind: SeasonKind;
  // ช่วงพีคโดยประมาณ (MM-DD) — อิงค่าเฉลี่ยหลายปี ไม่ใช่พยากรณ์รายปี
  from: string;
  to: string;
  note: string;
};

const seasonsByCity: Record<string, SeasonHighlight[]> = {
  sapporo: [
    { name: "ซากุระ", kind: "bloom", from: "04-25", to: "05-10", note: "บานช้ากว่าเกาะหลักราวหนึ่งเดือน จุดหลัก Maruyama Park และ Hokkaido Jingu" },
    { name: "เบียร์การ์เดนฤดูร้อน", kind: "event", from: "07-20", to: "08-15", note: "ลานเบียร์กลางสวน Odori ยาวตลอดปลายกรกฎาคม" },
    { name: "ใบไม้แดง", kind: "foliage", from: "10-15", to: "11-03", note: "Jozankei พีคก่อนในเมืองราวสองสัปดาห์ จัดทริปออนเซ็น+ใบไม้แดงพร้อมกันได้" },
    { name: "Sapporo Snow Festival", kind: "snow", from: "02-04", to: "02-11", note: "งานหิมะใหญ่สุดของญี่ปุ่น ที่พักเต็มล่วงหน้าหลายเดือน" },
  ],
  otaru: [
    { name: "ซากุระ", kind: "bloom", from: "04-28", to: "05-10", note: "Temiya Park และริมคลองช่วงต้นพฤษภาคม" },
    { name: "ใบไม้แดง", kind: "foliage", from: "10-20", to: "11-05", note: "กระเช้า Tenguyama ได้ทั้งใบไม้แดงและวิวอ่าว" },
    { name: "Snow Light Path", kind: "snow", from: "02-08", to: "02-15", note: "เทศกาลโคมหิมะริมคลอง จัดช่วงเดียวกับ Snow Festival ที่ Sapporo เที่ยวควบได้" },
  ],
  hakodate: [
    { name: "ซากุระ", kind: "bloom", from: "04-25", to: "05-08", note: "ป้อมดาว Goryokaku กลายเป็นวงแหวนซากุระ มองจากหอคอยสวยสุด" },
    { name: "ใบไม้แดง", kind: "foliage", from: "10-25", to: "11-10", note: "สวน Kosetsuen จัดไลต์อัปยามค่ำ" },
    { name: "Christmas Fantasy", kind: "event", from: "12-01", to: "12-25", note: "ต้นคริสต์มาสกลางอ่าวกับพลุทุกคืนย่านโกดังอิฐแดง" },
  ],
  asahikawa: [
    { name: "ซากุระ", kind: "bloom", from: "05-01", to: "05-12", note: "บานช้าสุดในลิสต์ — พลาดซากุระที่อื่นมาเก็บที่นี่ได้" },
    { name: "ลาเวนเดอร์ Furano", kind: "bloom", from: "06-25", to: "08-05", note: "Farm Tomita พีคกลางกรกฎาคม ไปเช้าก่อนทัวร์ลง" },
    { name: "ใบไม้แดง Daisetsuzan", kind: "foliage", from: "09-15", to: "10-05", note: "ใบไม้แดงแรกสุดของญี่ปุ่นบนกระเช้า Asahidake" },
    { name: "Winter Festival", kind: "snow", from: "02-06", to: "02-11", note: "ประติมากรรมหิมะริมแม่น้ำ จัดพร้อมงาน Sapporo นั่งรถไฟไปกลับได้" },
  ],
  tokyo: [
    { name: "ซากุระ", kind: "bloom", from: "03-25", to: "04-08", note: "Ueno, แม่น้ำ Meguro และคูวัง Chidorigafuchi คือสามจุดคลาสสิก" },
    { name: "ใบไม้แดง/แปะก๊วย", kind: "foliage", from: "11-15", to: "12-05", note: "ถนนแปะก๊วย Meiji Jingu Gaien และสวน Rikugien ไลต์อัป" },
  ],
  kawaguchiko: [
    { name: "ซากุระ + ฟูจิ", kind: "bloom", from: "04-05", to: "04-20", note: "ฝั่งเหนือทะเลสาบได้เฟรมซากุระ-ทะเลสาบ-ฟูจิในรูปเดียว" },
    { name: "พิงค์มอส (Shibazakura)", kind: "bloom", from: "04-15", to: "05-25", note: "Fuji Shibazakura Festival ทุ่งชมพูตีนฟูจิ" },
    { name: "ใบไม้แดง", kind: "foliage", from: "10-25", to: "11-15", note: "Momiji Corridor ริมทะเลสาบ มีไลต์อัปตอนค่ำ" },
  ],
  kamakura: [
    { name: "อาจิไซ (ไฮเดรนเยีย)", kind: "bloom", from: "06-01", to: "07-05", note: "Meigetsu-in และบันได Hasedera — มิถุนายนคือพีคของเมืองนี้ ไปเช้าเลี่ยงคิว" },
    { name: "ซากุระ", kind: "bloom", from: "03-28", to: "04-10", note: "แนวถนน Dankazura สู่ศาลเจ้า Hachimangu" },
    { name: "ใบไม้แดง", kind: "foliage", from: "11-25", to: "12-10", note: "พีคช้ากว่าที่อื่น — เก็บตกปลายฤดูได้ที่วัดโซน Kita-Kamakura" },
  ],
  izu: [
    { name: "คาวาซุซากุระ", kind: "bloom", from: "02-10", to: "03-10", note: "ซากุระบานเร็วสุดของเกาะหลัก สีเข้มกว่าปกติ ที่เมือง Kawazu ฝั่งตะวันออก" },
    { name: "ใบไม้แดง", kind: "foliage", from: "11-20", to: "12-05", note: "น้ำตก Joren และ Shuzenji ช่วงปลายพฤศจิกายน" },
  ],
  karuizawa: [
    { name: "ซากุระ", kind: "bloom", from: "04-15", to: "04-30", note: "บานช้ากว่าโตเกียวเพราะอยู่สูง อากาศยังเย็นสบาย" },
    { name: "ใบไม้แดง", kind: "foliage", from: "10-15", to: "11-05", note: "บ่อ Kumoba คือกระจกสะท้อนใบไม้แดงของเมือง ไปเช้าก่อนลมพัด" },
  ],
  nagoya: [
    { name: "ซากุระ", kind: "bloom", from: "03-25", to: "04-08", note: "ปราสาท Nagoya และแม่น้ำ Yamazaki" },
    { name: "ใบไม้แดง Korankei", kind: "foliage", from: "11-15", to: "12-05", note: "หุบเขา Korankei ห่างเมือง ~1 ชม. คือใบไม้แดงระดับประเทศ" },
  ],
  takayama: [
    { name: "Takayama Matsuri (ฤดูใบไม้ผลิ)", kind: "event", from: "04-14", to: "04-15", note: "หนึ่งในสามเทศกาลแห่เกี้ยวสวยสุดของญี่ปุ่น ตรงซากุระบานพอดี" },
    { name: "ซากุระ", kind: "bloom", from: "04-10", to: "04-25", note: "เมืองเก่า+แม่น้ำ Miyagawa บานช้ากว่าโตเกียวสองสัปดาห์" },
    { name: "Takayama Matsuri (ฤดูใบไม้ร่วง)", kind: "event", from: "10-09", to: "10-10", note: "รอบฤดูใบไม้ร่วงของเทศกาลเดียวกัน ที่พักเต็มเร็ว" },
    { name: "ใบไม้แดง", kind: "foliage", from: "10-15", to: "11-05", note: "เส้น Shirakawa-go และ Okuhida พีคไล่จากที่สูงลงมา" },
  ],
  kanazawa: [
    { name: "ซากุระ", kind: "bloom", from: "04-01", to: "04-12", note: "Kenrokuen เปิดให้เข้าฟรีช่วงบานเต็มที่" },
    { name: "ใบไม้แดง", kind: "foliage", from: "11-10", to: "11-30", note: "Kenrokuen เริ่มผูกเชือกกันหิมะ (yukitsuri) ปลายฤดู ได้สองบรรยากาศ" },
    { name: "หิมะ + yukitsuri", kind: "snow", from: "01-05", to: "02-20", note: "สวนหิมะกับร่มเชือกกันหิมะคือภาพจำฤดูหนาวของเมืองนี้" },
  ],
  kyoto: [
    { name: "ซากุระ", kind: "bloom", from: "03-28", to: "04-10", note: "Philosopher's Path, Maruyama Park — จองที่พักล่วงหน้ามาก" },
    { name: "Gion Matsuri", kind: "event", from: "07-01", to: "07-31", note: "เทศกาลทั้งเดือน ขบวนแห่ใหญ่ 17 ก.ค. ร้อนแต่คุ้ม" },
    { name: "ใบไม้แดง", kind: "foliage", from: "11-15", to: "12-05", note: "พีคสุดและคนแน่นสุดของปี — Tofukuji/Arashiyama ไปก่อน 8 โมง" },
  ],
  osaka: [
    { name: "ซากุระ", kind: "bloom", from: "03-28", to: "04-10", note: "ปราสาท Osaka และริมแม่น้ำ Okawa นั่งเรือชมได้" },
    { name: "Tenjin Matsuri", kind: "event", from: "07-24", to: "07-25", note: "เทศกาลเรือ+พลุกลางแม่น้ำ หนึ่งในสามเทศกาลใหญ่ของญี่ปุ่น" },
    { name: "ใบไม้แดง", kind: "foliage", from: "11-15", to: "12-05", note: "น้ำตก Minoo ห่างเมืองครึ่งชั่วโมง เดินป่าเบาๆ ได้" },
  ],
  nara: [
    { name: "ซากุระ", kind: "bloom", from: "03-28", to: "04-10", note: "สวนกวาง+ซากุระ — ภูเขา Yoshino ระดับตำนานอยู่ถัดไปอีกชั่วโมง" },
    { name: "ใบไม้แดง", kind: "foliage", from: "11-10", to: "12-05", note: "สวนกวางช่วงใบเปลี่ยนสีคือ Nara ที่สวยสุดของปี" },
  ],
  kobe: [
    { name: "ซากุระ", kind: "bloom", from: "03-28", to: "04-10", note: "Shukugawa และสวนรอบปราสาทฝั่ง Himeji" },
    { name: "ใบไม้แดง", kind: "foliage", from: "11-15", to: "12-05", note: "สวน Nunobiki บนกระเช้า และออนเซ็นเก่า Arima" },
  ],
  hiroshima: [
    { name: "ซากุระ", kind: "bloom", from: "03-25", to: "04-08", note: "เกาะ Miyajima กับปราสาท Hiroshima" },
    { name: "ใบไม้แดง", kind: "foliage", from: "11-10", to: "11-30", note: "หุบเขา Momijidani บน Miyajima — ชื่อหุบเขาก็แปลว่าใบเมเปิลแล้ว" },
  ],
  fukuoka: [
    { name: "ซากุระ", kind: "bloom", from: "03-23", to: "04-05", note: "บานเร็วกว่าโตเกียวเล็กน้อย จุดหลักซากปราสาท Maizuru Park" },
    { name: "Hakata Gion Yamakasa", kind: "event", from: "07-01", to: "07-15", note: "ปิดท้ายด้วยแห่เกี้ยววิ่งตี 5 วันที่ 15 ก.ค." },
    { name: "ใบไม้แดง", kind: "foliage", from: "11-20", to: "12-05", note: "วัด Komyozenji ที่ Dazaifu สวนหินใบแดง" },
  ],
  sendai: [
    { name: "ซากุระ", kind: "bloom", from: "04-05", to: "04-18", note: "Tsutsujigaoka Park และปราสาท Shiroishi ถัดไปหนึ่งสถานี Shinkansen" },
    { name: "Tanabata Matsuri", kind: "event", from: "08-06", to: "08-08", note: "เทศกาลทานาบาตะใหญ่สุดในญี่ปุ่น ถนนการค้าเต็มไปด้วยพู่กระดาษยักษ์" },
    { name: "ใบไม้แดง", kind: "foliage", from: "10-20", to: "11-15", note: "หุบเขา Akiu และ Yamadera ช่วงปลายตุลาคม" },
  ],
  naha: [
    { name: "คันฮิซากุระ", kind: "bloom", from: "01-20", to: "02-10", note: "ซากุระแรกสุดของญี่ปุ่น สีชมพูเข้ม บานจากเหนือเกาะลงใต้" },
    { name: "ฤดูวาฬหลังค่อม", kind: "event", from: "01-01", to: "03-31", note: "ทัวร์ชมวาฬออกจาก Naha ใช้เวลาครึ่งวัน อัตราเจอสูงมาก" },
  ],
  yokohama: [
    { name: "ซากุระ", kind: "bloom", from: "03-28", to: "04-10", note: "ริมแม่น้ำ Ooka และ Sankeien — สวนญี่ปุ่นเก่ากลางเมืองท่า" },
    { name: "กุหลาบ Yamashita", kind: "bloom", from: "05-10", to: "06-05", note: "สวนริมอ่าวเต็มไปด้วยกุหลาบ รอบสองมาอีกทีตุลาคม" },
    { name: "ใบไม้แดง", kind: "foliage", from: "11-20", to: "12-10", note: "Sankeien พีคช้ากว่าโตเกียวนิดหน่อย มีไลต์อัปบางช่วง" },
  ],
  hakone: [
    { name: "ซากุระ", kind: "bloom", from: "04-01", to: "04-20", note: "บานช้ากว่าโตเกียวเพราะอยู่สูง — ริมทะเลสาบ Ashi ได้ซากุระคู่ฟูจิ" },
    { name: "ไฮเดรนเยียรถไฟ", kind: "bloom", from: "06-15", to: "07-10", note: "รถไฟ Tozan วิ่งผ่านอุโมงค์ไฮเดรนเยีย มีขบวนไลต์อัปตอนค่ำ" },
    { name: "ใบไม้แดง", kind: "foliage", from: "11-05", to: "11-25", note: "พีคจากที่สูง (Owakudani) ไล่ลงมาทะเลสาบ — กระเช้าคือที่นั่งชั้นดี" },
    { name: "ฟูจิหิมะ + ออนเซ็น", kind: "snow", from: "12-15", to: "02-28", note: "อากาศใสสุดของปี เห็นฟูจิชัดที่สุด แช่ออนเซ็นมองหิมะ" },
  ],
  nikko: [
    { name: "ซากุระ", kind: "bloom", from: "04-15", to: "04-30", note: "บานช้ากว่าโตเกียวสองสัปดาห์ ยิ่งขึ้นเขา Chuzenji ยิ่งช้าถึงพฤษภาคม" },
    { name: "ใบไม้แดง Irohazaka", kind: "foliage", from: "10-10", to: "11-05", note: "ถนนโค้ง 48 โค้งขึ้นทะเลสาบ Chuzenji — ใบไม้แดงระดับประเทศ รถติดหนักวันหยุด ไปเช้าตรู่" },
    { name: "หิมะศาลเจ้า", kind: "snow", from: "01-05", to: "02-20", note: "Toshogu ปกหิมะคือภาพที่คนรอทั้งปี ถนนขึ้นเขาต้องใช้ยางหิมะ" },
  ],
  matsumoto: [
    { name: "ซากุระ + ปราสาทดำ", kind: "bloom", from: "04-08", to: "04-22", note: "ปราสาทไม้ดำคู่ซากุระคู่เทือกเขาแอลป์ในเฟรมเดียว มีไลต์อัปกลางคืน" },
    { name: "Kamikochi เปิดฤดู", kind: "event", from: "04-27", to: "11-15", note: "หุบเขาแอลป์ญี่ปุ่น เปิดเฉพาะช่วงนี้ — ปิดตายหน้าหนาว ใบไม้แดงพีคต้นตุลาคม" },
    { name: "ใบไม้แดง", kind: "foliage", from: "10-20", to: "11-10", note: "ในเมืองพีคปลายตุลา บนเขา Kamikochi พีคก่อนราวสามสัปดาห์" },
  ],
  nagano: [
    { name: "ซากุระ", kind: "bloom", from: "04-10", to: "04-25", note: "วัด Zenkoji และสวน Joyama บานช้ากว่าโตเกียวราวสองสัปดาห์" },
    { name: "ลิงออนเซ็น", kind: "event", from: "12-01", to: "03-15", note: "Jigokudani ลิงแช่บ่อน้ำร้อน — หน้าหนาวคือช่วงที่ลงบ่อจริงจังที่สุด" },
    { name: "ใบไม้แดง", kind: "foliage", from: "10-15", to: "11-10", note: "Togakushi และเส้นทางขึ้น Zenkoji" },
    { name: "หิมะ", kind: "snow", from: "01-05", to: "02-28", note: "ฐานสกีของโอลิมปิก 1998 — Hakuba/Shiga Kogen ต่อรถจากเมืองได้" },
  ],
  kagoshima: [
    { name: "ซากุระ", kind: "bloom", from: "03-25", to: "04-08", note: "สวน Sengan-en มีภูเขาไฟ Sakurajima เป็นฉากหลัง" },
    { name: "ดอกไม้ไฟ Kinko Bay", kind: "event", from: "08-20", to: "08-25", note: "พลุใหญ่สุดของคิวชูกลางอ่าว ที่พักเต็มเร็ว" },
    { name: "ใบไม้แดง", kind: "foliage", from: "11-20", to: "12-10", note: "หุบเขา Ryumon และรอบ Kirishima" },
  ],
  beppu: [
    { name: "ซากุระ", kind: "bloom", from: "03-25", to: "04-08", note: "สวน Beppu และ Shidaka ริมทะเลสาบบนเขา" },
    { name: "ไอน้ำหน้าหนาว", kind: "snow", from: "12-01", to: "02-28", note: "อากาศเย็นทำให้ไอน้ำจากบ่อลอยทั่วเมือง — ภาพจำของ Beppu ชัดสุดหน้าหนาว" },
    { name: "ใบไม้แดง", kind: "foliage", from: "11-05", to: "11-30", note: "Kankaiji และเส้นทางขึ้นเขา Tsurumi ทางกระเช้า" },
  ],
  yufuin: [
    { name: "ซากุระ", kind: "bloom", from: "04-01", to: "04-15", note: "บานช้ากว่า Beppu เพราะอยู่บนที่สูง — ริมทะเลสาบ Kinrin" },
    { name: "หมอกเช้าทะเลสาบ", kind: "event", from: "10-15", to: "12-15", note: "หมอกลอยเหนือทะเลสาบ Kinrin ช่วงเช้ามืดอากาศเย็น — ต้องไปก่อน 7 โมง" },
    { name: "ใบไม้แดง", kind: "foliage", from: "11-05", to: "11-30", note: "รอบทะเลสาบและเส้นทางเดินเท้าเชิงเขา Yufu" },
  ],
  kumamoto: [
    { name: "ซากุระ", kind: "bloom", from: "03-25", to: "04-08", note: "ปราสาท Kumamoto ที่บูรณะหลังแผ่นดินไหว — ซากุระรอบกำแพงหิน" },
    { name: "ทุ่งหญ้า Aso", kind: "event", from: "04-20", to: "10-20", note: "ปากปล่องภูเขาไฟ Aso เปิดตามสถานะแก๊ส เช็กก่อนไปเสมอ" },
    { name: "ใบไม้แดง", kind: "foliage", from: "11-10", to: "12-05", note: "หุบเขา Kikuchi และเส้นทางรอบ Aso" },
  ],
  miyajima: [
    { name: "ซากุระ", kind: "bloom", from: "03-28", to: "04-10", note: "ซากุระรอบศาลเจ้าลอยน้ำ + กวางเดินปนคน" },
    { name: "ใบไม้แดง Momijidani", kind: "foliage", from: "11-10", to: "11-30", note: "ชื่อหุบเขาแปลว่า 'หุบใบเมเปิล' ตรงตัว — พีคกลางพฤศจิกา คนแน่นสุดของปี" },
    { name: "Kangensai", kind: "event", from: "07-20", to: "07-25", note: "เทศกาลเรือดนตรีโบราณกลางน้ำ อิงปฏิทินจันทรคติ เช็กวันก่อน" },
  ],
  ishigaki: [
    { name: "ทะเลใส/ดำน้ำ", kind: "event", from: "04-01", to: "10-31", note: "น้ำใสสุดและคลื่นนิ่ง — Kabira Bay กับ Manta Scramble พีคหน้าร้อน" },
    { name: "ฤดูไต้ฝุ่น", kind: "event", from: "07-01", to: "10-15", note: "⚠ ไต้ฝุ่นเข้าบ่อยสุดของญี่ปุ่น เที่ยวบิน/เรือยกเลิกได้ทั้งวัน เผื่อวันสำรอง" },
    { name: "ดาวใต้ + ทางช้างเผือก", kind: "event", from: "06-01", to: "08-31", note: "เกาะมืดพอเห็นกางเขนใต้ได้ — หนึ่งในไม่กี่ที่ในญี่ปุ่นที่เห็น" },
  ],
  matsuyama: [
    { name: "ซากุระ", kind: "bloom", from: "03-25", to: "04-08", note: "ปราสาท Matsuyama บนยอดเขา ขึ้นกระเช้าไปชมได้ทั้งเมือง" },
    { name: "ใบไม้แดง", kind: "foliage", from: "11-15", to: "12-05", note: "รอบปราสาทและ Dogo Onsen — ออนเซ็นเก่าแก่สุดของญี่ปุ่น" },
  ],
  okayama: [
    { name: "ซากุระ", kind: "bloom", from: "03-28", to: "04-10", note: "สวน Korakuen หนึ่งในสามสวนที่สวยที่สุดของญี่ปุ่น คู่ปราสาทดำ" },
    { name: "ใบไม้แดง", kind: "foliage", from: "11-15", to: "12-05", note: "Korakuen มีไลต์อัปตอนค่ำช่วงพีค" },
    { name: "ลูกพีช", kind: "event", from: "07-01", to: "08-31", note: "Okayama = เมืองลูกพีช สวนให้เก็บเองช่วงกลางฤดูร้อน" },
  ],
  kurashiki: [
    { name: "ซากุระ", kind: "bloom", from: "03-28", to: "04-10", note: "ริมคลองย่านโกดังเก่า Bikan — นั่งเรือลอดซุ้มซากุระได้" },
    { name: "ใบไม้แดง", kind: "foliage", from: "11-15", to: "12-05", note: "ย่านคลองเก่ากับเส้นทางขึ้น Achi Shrine" },
  ],
  takamatsu: [
    { name: "ซากุระ", kind: "bloom", from: "03-28", to: "04-10", note: "สวน Ritsurin — สวนเดินชมที่ใหญ่สุดของญี่ปุ่น" },
    { name: "Setouchi Triennale", kind: "event", from: "04-15", to: "11-05", note: "เทศกาลศิลปะเกาะทะเลใน จัดทุก 3 ปี (รอบถัดไป 2028) เรือไปเกาะเต็มเร็ว" },
    { name: "ใบไม้แดง", kind: "foliage", from: "11-20", to: "12-05", note: "Ritsurin ไลต์อัปตอนค่ำช่วงพีค — สะท้อนบ่อสวย" },
  ],
  aomori: [
    { name: "ซากุระ Hirosaki", kind: "bloom", from: "04-22", to: "05-05", note: "ปราสาท Hirosaki = จุดซากุระอันดับต้นของประเทศ กลีบร่วงลอยเต็มคูน้ำ" },
    { name: "Nebuta Matsuri", kind: "event", from: "08-02", to: "08-07", note: "เทศกาลโคมยักษ์แห่กลางคืน หนึ่งในเทศกาลใหญ่สุดของโทโฮคุ ที่พักเต็มหลายเดือน" },
    { name: "ใบไม้แดง Oirase", kind: "foliage", from: "10-15", to: "11-05", note: "ลำธาร Oirase กับทะเลสาบ Towada — เดินเลียบน้ำตกท่ามกลางใบแดง" },
    { name: "หิมะหนัก", kind: "snow", from: "12-15", to: "03-10", note: "หนึ่งในเมืองที่หิมะตกหนักสุดในโลก — ต้นไม้น้ำแข็ง Hakkoda คือของพิเศษ" },
  ],
  shizuoka: [
    { name: "ซากุระ + ฟูจิ", kind: "bloom", from: "03-25", to: "04-10", note: "Miho no Matsubara ได้ซากุระ ทะเล และฟูจิพร้อมกัน" },
    { name: "ไร่ชาเขียวใหม่", kind: "event", from: "04-20", to: "05-31", note: "ชาใบแรกของปี (shincha) — ไร่ชาเขียวสดที่สุดของปี" },
    { name: "ฟูจิใสหน้าหนาว", kind: "snow", from: "12-01", to: "02-28", note: "อากาศแห้งใส เห็นฟูจิหิมะปกยอดชัดสุด" },
  ],
  atami: [
    { name: "ซากุระ Atami", kind: "bloom", from: "01-10", to: "02-10", note: "ซากุระบานเร็วสุดในแถบคันโต — บานตั้งแต่กลางมกราคม คู่กับดอกบ๊วย" },
    { name: "ดอกบ๊วย", kind: "bloom", from: "01-10", to: "03-05", note: "สวนบ๊วย Atami เก่าแก่ บานคาบกับซากุระต้นฤดู เก็บสองอย่างในทริปเดียว" },
    { name: "พลุริมทะเล", kind: "event", from: "07-20", to: "08-25", note: "Atami จัดพลุหลายรอบตลอดปี หน้าร้อนถี่สุด — ดูจากออนเซ็นริมทะเลได้" },
  ],
  himeji: [
    { name: "ซากุระ + ปราสาทขาว", kind: "bloom", from: "03-28", to: "04-12", note: "ปราสาทขาวมรดกโลกคู่ซากุระ — หนึ่งในภาพคลาสสิกที่สุดของญี่ปุ่น" },
    { name: "ใบไม้แดง Engyoji", kind: "foliage", from: "11-15", to: "12-05", note: "วัดบนเขา Shosha (ที่ถ่าย The Last Samurai) ขึ้นกระเช้า คนน้อยกว่าปราสาทมาก" },
  ],
  wakayama: [
    { name: "ซากุระ", kind: "bloom", from: "03-28", to: "04-10", note: "ปราสาท Wakayama และ Kimiidera ที่ขึ้นชื่อว่าซากุระบานก่อนใครในคันไซ" },
    { name: "ใบไม้แดง", kind: "foliage", from: "11-15", to: "12-05", note: "หุบเขา Dorokyo และเส้นทางแสวงบุญ Kumano Kodo" },
    { name: "ลูกพลับ/ส้ม", kind: "event", from: "10-15", to: "12-15", note: "Wakayama = แหล่งส้มมิคังและพลับอันดับหนึ่งของญี่ปุ่น" },
  ],
  koyasan: [
    { name: "ซากุระ", kind: "bloom", from: "04-20", to: "05-05", note: "บานช้ามากเพราะอยู่สูง 800 ม. — เก็บตกซากุระหลังคันไซโรยหมดแล้ว" },
    { name: "ใบไม้แดง", kind: "foliage", from: "10-25", to: "11-15", note: "พีคเร็วกว่าคันไซพื้นราบ — สุสาน Okunoin กับใบแดงคือบรรยากาศที่คนมาหา" },
    { name: "หิมะวัด", kind: "snow", from: "01-05", to: "02-20", note: "หนาวจัดกว่าโอซาก้ามาก ค้างวัด (shukubo) หน้าหนาวต้องเตรียมกันหนาวเต็มที่" },
  ],
};

export function getCitySeasons(slug: string): SeasonHighlight[] {
  return seasonsByCity[slug] ?? [];
}

export function hasCitySeasons(slug: string): boolean {
  return slug in seasonsByCity;
}

/** เมืองทั้งหมดที่มีข้อมูลฤดู — ใช้ตอบ "เดือนนี้ไปไหนดี" (เทียบข้ามเมือง) */
export function citiesWithSeasons(): string[] {
  return Object.keys(seasonsByCity);
}

/**
 * ฤดูของเมืองแบบ "ทั้งปี" ไม่ใช่แค่ที่กำลังเกิด — กร๊วกต้องเห็นทั้งหมดถึงจะตอบ
 * "ใบไม้แดงเมื่อไหร่" ตอนหน้าร้อนได้ (เดิมกรอง active ทิ้ง ข้อมูลมีแต่ไม่ถูกส่งไป)
 */
export function getCitySeasonCalendar(slug: string): (SeasonHighlight & { window: string })[] {
  return getCitySeasons(slug).map((season) => ({
    ...season,
    window: `${season.from} ถึง ${season.to}`,
  }));
}
