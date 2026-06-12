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
};

export function getCitySeasons(slug: string): SeasonHighlight[] {
  return seasonsByCity[slug] ?? [];
}
