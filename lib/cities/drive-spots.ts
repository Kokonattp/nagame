export type DriveSpot = {
  name: string;
  area: string;
  note: string;
  // mapcode จริงจากแหล่งเผยแพร่เท่านั้น — ห้ามเดาเพราะรหัสผิดพาไปผิดที่
  mapcode?: string;
  tel?: string;
};

export type CityDrive = {
  intro: string;
  source: string;
  spots: DriveSpot[];
};

// แหล่งอ้างอิงหลัก: ตาราง MAPCODE ทางการของ World Net Rent-A-Car (Hokkaido)
// ส่วนใหญ่เป็นรหัสของ "ลานจอดรถ" ของสถานที่นั้น ๆ ซึ่งคือสิ่งที่คนขับต้องการจริง
const driveByCity: Record<string, CityDrive> = {
  sapporo: {
    intro: "จุดที่รถสาธารณะไปลำบากหรือเสียเวลา ขับเองจาก Sapporo สะดวกกว่าเยอะ",
    source: "World Net Rent-A-Car Hokkaido mapcode guide",
    spots: [
      { name: "Shiroi Koibito Park", area: "Nishi-ku", mapcode: "9 603 301*88", note: "โรงงานคุกกี้ในตำนาน ~20 นาทีจากใจกลางเมือง" },
      { name: "Mt. Moiwa Ropeway (Sanroku)", area: "Minami-ku", mapcode: "9 400 523*00", note: "จอดที่สถานีตีนเขาแล้วขึ้นกระเช้าดูวิวกลางคืน" },
      { name: "Moerenuma Park", area: "Higashi-ku", mapcode: "9 741 093*47", note: "สวนดีไซน์ Isamu Noguchi รถเมล์ไปไม่สะดวก เหมาะขับเอง" },
      { name: "Hill of the Buddha", area: "Makomanai Takino", mapcode: "9 013 179*58", note: "พระใหญ่ในเนินลาเวนเดอร์ ผลงาน Tadao Ando" },
      { name: "Jozankei Onsen", area: "Minami-ku", mapcode: "708 754 327*44", note: "หุบเขาออนเซ็น ~50 นาที ใบไม้แดงสวยมากช่วงตุลาคม" },
      { name: "Lake Shikotsu", area: "Chitose", mapcode: "867 063 569*00", note: "ทะเลสาบน้ำใสระดับท็อปของญี่ปุ่น ~1 ชม. แวะก่อน/หลังสนามบินได้" },
    ],
  },
  otaru: {
    intro: "Otaru และคาบสมุทร Shakotan คือเส้นขับรถเลียบทะเลที่สวยสุดแถบนี้",
    source: "World Net Rent-A-Car Hokkaido mapcode guide",
    spots: [
      { name: "Otaru Canal", area: "ใจกลางเมือง", mapcode: "493 690 414*33", note: "คลองสัญลักษณ์เมือง มีลานจอดเมืองใกล้ ๆ (493 690 715*11)" },
      { name: "Mt. Tengu Ropeway", area: "Tenguyama", mapcode: "164 657 042*22", note: "วิวอ่าว Otaru มุมสูง ขับขึ้นไปจอดที่ตีนกระเช้า" },
      { name: "Otaru Aquarium", area: "Shukutsu", mapcode: "493 841 146*52", note: "อควาเรียมริมทะเลเหมาะกับสายครอบครัว" },
      { name: "Nikka Whisky Yoichi Distillery", area: "Yoichi", mapcode: "164 635 876*25", note: "โรงกลั่นต้นตำรับ ~30 นาทีจาก Otaru (คนขับห้ามชิม)" },
      { name: "Kamui Misaki", area: "Shakotan", mapcode: "932 583 036*47", note: "แหลมน้ำทะเลสีฟ้า Shakotan Blue ~1.5 ชม. คุ้มทั้งวัน" },
    ],
  },
  hakodate: {
    intro: "เมืองกะทัดรัด แต่มีหลายจุดที่ขับรถแล้วเก็บได้ครบกว่า โดยเฉพาะ Onuma",
    source: "World Net Rent-A-Car Hokkaido mapcode guide",
    spots: [
      { name: "Mt. Hakodate Ropeway (Sanroku)", area: "Motomachi", mapcode: "86 041 004*55", note: "จอดตีนเขาขึ้นกระเช้า — ถนนขึ้นยอดปิดช่วงเย็นฤดูท่องเที่ยว" },
      { name: "Goryokaku Tower", area: "Goryokaku", mapcode: "86 165 294*14", note: "ป้อมดาว 5 แฉก รหัสนี้คือลานจอดสำหรับนักท่องเที่ยว" },
      { name: "Kanemori Red Brick Warehouse", area: "Bay Area", mapcode: "86 041 552*33", note: "โกดังอิฐแดงริมอ่าว ของฝาก+คาเฟ่ครบ" },
      { name: "Hakodate Morning Market", area: "ข้างสถานี", mapcode: "86 072 344*33", note: "ตลาดเช้า ดงข้าวหน้าปลาสด ไปก่อน 9 โมงของยังครบ" },
      { name: "Onuma Quasi-National Park", area: "Nanae", mapcode: "86 816 665*28", note: "ทะเลสาบ+เกาะเล็กใต้ภูเขา Komagatake ~40 นาทีจากเมือง" },
    ],
  },
  asahikawa: {
    intro: "ฐานขับรถสาย Biei-Furano เส้นทุ่งดอกไม้และบ่อสีฟ้าที่คนเช่ารถมาเก็บกันมากที่สุด",
    source: "World Net Rent-A-Car Hokkaido mapcode guide",
    spots: [
      { name: "Asahiyama Zoo", area: "Asahikawa", mapcode: "79 387 054*36", note: "สวนสัตว์อันดับหนึ่งของเกาะ รหัสนี้คือลานจอดประตูตะวันตก" },
      { name: "Aoiike (Blue Pond)", area: "Biei", mapcode: "349 569 603*11", note: "บ่อน้ำสีฟ้า ~50 นาที ไปเช้าก่อนทัวร์ลงสวยสุด" },
      { name: "Shirahige Waterfall", area: "Biei / Shirogane", mapcode: "796 182 516*00", note: "น้ำตกเส้นด้ายสีฟ้า ห่าง Blue Pond แค่ 5 นาที จอดลานสาธารณะ" },
      { name: "Shikisai-no-oka", area: "Biei", mapcode: "349 701 216*03", note: "เนินดอกไม้ลายรุ้ง พีคสุดกรกฎาคม-สิงหาคม" },
      { name: "Farm Tomita", area: "Nakafurano", mapcode: "349 276 837*25", note: "ทุ่งลาเวนเดอร์ตำนานของ Furano ~1 ชม.จาก Asahikawa" },
      { name: "Asahidake Ropeway", area: "Daisetsuzan", mapcode: "796 861 067*52", note: "กระเช้าขึ้นยอดสูงสุดของ Hokkaido ใบไม้เปลี่ยนสีเร็วสุดในญี่ปุ่น" },
    ],
  },
  takayama: {
    intro: "ฐานขับรถสาย Northern Alps — Shirakawa-go, Okuhida และประตูสู่ Kamikochi (โซนควบคุมรถ ต้องรู้กฎก่อนไป)",
    source: "โบรชัวร์ทางการ Okuhida Onsen-go / Toyota Rent-a-Car + กฎจอดรถหมู่บ้าน Shirakawa",
    spots: [
      {
        name: "TOYOTA Rent-a-Car Takayama",
        area: "หน้าสถานี Takayama",
        mapcode: "191 195 469*82",
        note: "จุดรับรถหน้าสถานี (ชั้น 1 โรงแรม Washington Plaza) ใช้ตั้งต้นทุกเส้นในลิสต์นี้",
      },
      {
        name: "Shirakawa-go (Seseragi Parking)",
        area: "Shirakawa ~60 นาที",
        note: "หมู่บ้านมรดกโลก จำกัดรถเข้า 450 คัน/วัน ค่าจอด ¥2,000 เปิด 8:00-17:00 (เข้าได้ถึง 16:30) — ไปถึงก่อน 10 โมงชัวร์สุด",
      },
      {
        name: "Kamikochi (จอดที่ Akandana)",
        area: "Hirayu ~50 นาที",
        note: "รถส่วนตัวห้ามเข้า Kamikochi — จอดที่ Akandana ¥600/วัน แล้วต่อ shuttle 20 นาที (ไปกลับ ¥2,090 ทุก 30 นาที) เปิดปลาย เม.ย.-กลาง พ.ย.",
      },
      {
        name: "Shinhotaka Ropeway",
        area: "Okuhida ~75 นาที",
        tel: "0578-89-2458",
        note: "กระเช้า 2 ชั้นขึ้นจุดชมวิว 2,156 ม. ไปกลับ ¥3,300 จอด ¥600 (เบอร์ = ศูนย์ข้อมูล Okuhida)",
      },
      {
        name: "Norikura Skyline (จอดที่ Honokidaira)",
        area: "Hirayu",
        note: "ถนนสู่ยอด 3,026 ม. ห้ามรถส่วนตัวเช่นกัน — จอดแล้วต่อบัส (ไปกลับ ¥2,500) เปิด 15 พ.ค.-31 ต.ค.",
      },
      {
        name: "Hida no Sato (Folk Village)",
        area: "ชานเมือง ~10 นาที",
        note: "หมู่บ้านกัสโชโชว์วิถีชีวิตฮิดะใกล้เมือง — วันที่ไม่อยากขับไกลถึง Shirakawa-go มาที่นี่แทนได้",
      },
    ],
  },
  izu: {
    intro: "คาบสมุทรที่รถไฟไปถึงแค่ฝั่งตะวันออก — ขับเองคือทางเดียวที่เก็บชายฝั่งตะวันตกและตอนกลางได้ครบ",
    source: "Mapple (まっぷる) — เบอร์โทรสำหรับกดค้นใน car navi",
    spots: [
      {
        name: "Mt. Omuro (ลิฟต์ขึ้นปากปล่อง)",
        area: "Izu Kogen",
        tel: "0557-51-0258",
        note: "ภูเขาไฟทรงคว่ำชาม นั่งลิฟต์ขึ้นเดินวนปากปล่อง วิวฟูจิ 360° จอดฟรี 400 คัน",
      },
      {
        name: "Jogasaki Coast (สะพานแขวน Kadowaki)",
        area: "Ito",
        tel: "0557-37-6105",
        note: "สะพานแขวนเหนือผาลาวา 23 ม. จอดลาน Kadowaki ~¥500 เดินถึงสะพาน 5 นาที",
      },
      {
        name: "Joren Falls",
        area: "Amagi / กลางคาบสมุทร",
        tel: "0558-85-1056",
        note: "น้ำตก 25 ม. ใน 100 น้ำตกดังของญี่ปุ่น เส้นถนน Amagi มีวาซาบิสดให้ชิมตลอดทาง",
      },
      {
        name: "Koibito Misaki (Lovers' Cape)",
        area: "ฝั่งตะวันตก",
        note: "จุดชมฟูจิข้ามทะเล Suruga + ระฆังคู่รัก — ฝั่งนี้ไม่มีรถไฟ รถเท่านั้นที่พาไปถึง",
      },
      {
        name: "Shuzenji Onsen",
        area: "ตอนกลางคาบสมุทร",
        note: "เมืองออนเซ็นพันปี ย่านป่าไผ่+สะพานแดง เหมาะเป็นจุดค้างคืนกลางทริปวนรอบคาบสมุทร",
      },
    ],
  },
  karuizawa: {
    intro: "ตัวเมืองปั่นจักรยานสบาย แต่จุดธรรมชาติรอบนอก (น้ำตก ลานลาวา) ต้องใช้รถถึงจะคุ้มเวลา",
    source: "Mapple (まっぷる) — เบอร์โทรสำหรับกดค้นใน car navi",
    spots: [
      {
        name: "Onioshidashi-en",
        area: "Tsumagoi ~40 นาที",
        tel: "0279-86-4141",
        note: "ทุ่งหินลาวาจากการระเบิดของภูเขาไฟ Asama ปี 1783 หนึ่งในสามภูมิประเทศประหลาดของญี่ปุ่น",
      },
      {
        name: "Shiraito Falls",
        area: "Shiraito Highland Way",
        note: "น้ำตกม่านน้ำกว้าง 70 ม. อยู่บนถนนเก็บค่าผ่านทางที่เป็นทางลัดไป Onioshidashi พอดี — จัดเส้นเดียวเก็บสองจุด",
      },
      {
        name: "Kumoba Pond",
        area: "ใกล้เมืองเก่า",
        note: "บ่อน้ำกระจกสะท้อนใบไม้แดง เดินรอบ ~20 นาที ที่จอดน้อยมากช่วงพีค ไปเช้าหรือใช้จักรยานแทน",
      },
      {
        name: "Harunire Terrace",
        area: "Naka-Karuizawa",
        note: "เทอเรซร้านอาหาร/คาเฟ่ริมลำธารโซน Hoshino มีลานจอดฟรี เหมาะปิดท้ายวันขับรถ",
      },
    ],
  },
  kawaguchiko: {
    intro: "รอบทะเลสาบรถสาธารณะรอบน้อย ขับเองคุมเวลาแสงเช้า-เย็นถ่ายฟูจิได้ดีกว่า",
    source: "รวบรวมจากนักเดินทางที่แชร์ mapcode (Pantip) — จุดที่ไม่มีรหัสให้ค้นเพิ่มจาก japanmapcode.com",
    spots: [
      { name: "Kawaguchiko Station", area: "Fujikawaguchiko", mapcode: "161 272 351*52", note: "จุดอ้างอิงกลางเมือง คืนรถ/รับรถแถวนี้" },
      { name: "Mt. Fuji Panoramic Ropeway", area: "ฝั่งตะวันออกของทะเลสาบ", mapcode: "161 303 060", note: "กระเช้าวิวฟูจิ+ทะเลสาบ (ชื่อเดิม Kachi Kachi)" },
      { name: "Music Forest Museum", area: "ฝั่งเหนือของทะเลสาบ", mapcode: "161 362 259", note: "พิพิธภัณฑ์กล่องดนตรีวิวฟูจิ สวนสวยถ่ายรูปดี" },
      { name: "Herb Hall / ริมทะเลสาบใต้", area: "ฝั่งใต้ของทะเลสาบ", mapcode: "161 301 473", note: "จุดแวะริมน้ำ ใกล้ย่านคาเฟ่" },
      { name: "Oshino Hakkai", area: "Oshino", tel: "0555-84-4221", note: "บ่อน้ำศักดิ์สิทธิ์ 8 บ่อ — นาวีรถเช่าค้นจากเบอร์โทรนี้ได้เลย" },
      { name: "Chureito Pagoda / Oishi Park", area: "Fujiyoshida / ริมทะเลสาบ", note: "วิวโปสการ์ดฟูจิ — ยังไม่พบ mapcode จากแหล่งที่เชื่อถือได้ แนะนำค้นจาก japanmapcode.com แล้วจดไว้ก่อนออกเดินทาง" },
    ],
  },
};

export function getCityDrive(slug: string): CityDrive | null {
  return driveByCity[slug] ?? null;
}
