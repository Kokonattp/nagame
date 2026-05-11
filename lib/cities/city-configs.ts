import { slugifyCity } from "@/lib/utils/format";

export type RecommendationKind = "see" | "eat" | "sleep";

export type Recommendation = {
  title: string;
  area: string;
  note: string;
  signal: string;
  kind: RecommendationKind;
};

export type CityConfig = {
  name: string;
  slug: string;
  japaneseName: string;
  prefecture: string;
  lat: number;
  lon: number;
  heroTone: string;
  crowdBaseline: number;
  imageCredit?: string;
  livecam?: {
    title: string;
    source: string;
    url: string;
    previewImage?: string;
  };
  eventLinks?: {
    title: string;
    url: string;
  }[];
  recommendations: Recommendation[];
};

function quickRecommendations(input: {
  see: [string, string, string][];
  eat: [string, string, string][];
  sleep: [string, string, string][];
}): Recommendation[] {
  return [
    ...input.see.map(([title, area, signal]) => ({
      kind: "see" as const,
      title,
      area,
      signal,
      note: "เหมาะเมื่อสภาพอากาศเปิด เดินง่าย และมีเวลาพอสำหรับจังหวะช้า ๆ",
    })),
    ...input.eat.map(([title, area, signal]) => ({
      kind: "eat" as const,
      title,
      area,
      signal,
      note: "ตัวเลือกท้องถิ่นที่เข้ากับวันเดินเมืองและเปลี่ยนแผนได้ง่าย",
    })),
    ...input.sleep.map(([title, area, signal]) => ({
      kind: "sleep" as const,
      title,
      area,
      signal,
      note: "ฐานพักที่ช่วยให้ต่อรถ เดินกิน หรือเริ่มวันถัดไปได้สะดวกขึ้น",
    })),
  ];
}

const rawConfigs: Omit<CityConfig, "slug">[] = [
  {
    name: "Fukuoka",
    japaneseName: "福岡",
    prefecture: "Fukuoka",
    lat: 33.5902,
    lon: 130.4017,
    heroTone: "from-sky-500 via-cyan-300 to-amber-200",
    crowdBaseline: 58,
    livecam: {
      title: "Fukuoka city live camera",
      source: "KBC / local livecam directory",
      url: "https://kbc.co.jp/weather/livecamera/",
    },
    eventLinks: [{ title: "Fukuoka Now events", url: "https://www.fukuoka-now.com/en/event/" }],
    recommendations: [
      { kind: "see", title: "Ohori Park", area: "Chuo", note: "เดินง่าย เหมาะกับวันที่ลมไม่แรง", signal: "พื้นที่เปิด + ใกล้รถไฟ" },
      { kind: "see", title: "Canal City Hakata", area: "Hakata", note: "ตัวเลือกปลอดฝน มีร้านและทางเดินในร่ม", signal: "ดีเมื่อฝนมีโอกาสตก" },
      { kind: "eat", title: "Yatai around Nakasu", area: "Nakasu", note: "เหมาะตอนเย็น ถ้าอากาศนิ่งและฝนน้อย", signal: "ประสบการณ์ท้องถิ่น" },
      { kind: "eat", title: "Hakata ramen near station", area: "Hakata", note: "ทางเลือกเร็วหลังเดินทางถึงเมือง", signal: "ใกล้ transit" },
      { kind: "sleep", title: "Hakata Station base", area: "Hakata", note: "เหมาะกับทริปสั้นและวันย้ายเมือง", signal: "รถไฟ/สนามบินสะดวก" },
      { kind: "sleep", title: "Tenjin base", area: "Tenjin", note: "เหมาะกับช้อป กิน และเดินกลางคืน", signal: "แหล่งเมืองแน่น" },
    ],
  },
  {
    name: "Tokyo",
    japaneseName: "東京",
    prefecture: "Tokyo",
    lat: 35.6764,
    lon: 139.65,
    heroTone: "from-indigo-500 via-sky-300 to-rose-200",
    crowdBaseline: 82,
    livecam: { title: "Tokyo live camera directory", source: "Tokyo livecam listings", url: "https://www.youtube.com/results?search_query=tokyo+live+camera" },
    recommendations: [
      { kind: "see", title: "Meiji Jingu", area: "Harajuku", note: "พักจากเมืองใหญ่และเดินใต้ร่มไม้", signal: "เหมาะวันอากาศดี" },
      { kind: "see", title: "Tokyo Station area", area: "Marunouchi", note: "เดินต่อเนื่องได้ทั้งในร่มและกลางแจ้ง", signal: "ดีเมื่ออากาศไม่นิ่ง" },
      { kind: "eat", title: "Depachika food halls", area: "Ginza / Shinjuku", note: "ตัวเลือกเยอะและหลบฝนง่าย", signal: "ในร่ม" },
      { kind: "eat", title: "Tsukiji outer market", area: "Tsukiji", note: "เหมาะช่วงเช้าเมื่อคนยังไม่แน่นมาก", signal: "เช้าเป็นหลัก" },
      { kind: "sleep", title: "Shinjuku base", area: "Shinjuku", note: "สะดวกสำหรับรถไฟหลายสาย", signal: "hub ใหญ่" },
      { kind: "sleep", title: "Ueno base", area: "Ueno", note: "คุ้มค่าและต่อรถไปสนามบินง่าย", signal: "transit ดี" },
    ],
  },
  {
    name: "Osaka",
    japaneseName: "大阪",
    prefecture: "Osaka",
    lat: 34.6937,
    lon: 135.5023,
    heroTone: "from-violet-500 via-fuchsia-300 to-orange-200",
    crowdBaseline: 76,
    livecam: { title: "Dotonbori live camera search", source: "Public livecam listings", url: "https://www.youtube.com/results?search_query=dotonbori+live+camera" },
    recommendations: [
      { kind: "see", title: "Osaka Castle Park", area: "Chuo", note: "เหมาะเดินช่วงเช้าหรือเย็น", signal: "พื้นที่เปิด" },
      { kind: "see", title: "Nakanoshima", area: "Kita", note: "ริมน้ำ เดินง่ายเมื่ออากาศปลอดโปร่ง", signal: "วิวเมือง" },
      { kind: "eat", title: "Dotonbori", area: "Namba", note: "เด่นเรื่อง street food แต่คนแน่น", signal: "คึกคักสูง" },
      { kind: "eat", title: "Kuromon Market", area: "Nipponbashi", note: "ดีช่วงก่อนเที่ยง", signal: "เช้า-กลางวัน" },
      { kind: "sleep", title: "Namba base", area: "Namba", note: "เหมาะสายกินและเดินกลางคืน", signal: "night access" },
      { kind: "sleep", title: "Umeda base", area: "Kita", note: "เหมาะต่อรถไป Kyoto/Kobe", signal: "rail hub" },
    ],
  },
  {
    name: "Kyoto",
    japaneseName: "京都",
    prefecture: "Kyoto",
    lat: 35.0116,
    lon: 135.7681,
    heroTone: "from-emerald-500 via-teal-200 to-amber-100",
    crowdBaseline: 79,
    livecam: { title: "Kyoto live camera search", source: "Public livecam listings", url: "https://www.youtube.com/results?search_query=kyoto+live+camera" },
    recommendations: [
      { kind: "see", title: "Philosopher's Path", area: "Sakyo", note: "ดีที่สุดเมื่อฝนน้อยและอากาศเย็น", signal: "เดินยาว" },
      { kind: "see", title: "Nijo Castle", area: "Nakagyo", note: "จัดการเวลาได้ง่ายในเมือง", signal: "ประวัติศาสตร์" },
      { kind: "eat", title: "Nishiki Market", area: "Central Kyoto", note: "เหมาะวันฝนและอยากลองหลายอย่าง", signal: "ในร่มบางส่วน" },
      { kind: "eat", title: "Pontocho", area: "Kamo River", note: "เหมาะเย็นที่อากาศไม่ชื้นมาก", signal: "dinner area" },
      { kind: "sleep", title: "Kyoto Station base", area: "Shimogyo", note: "เหมาะทริปสั้นและ day trip", signal: "transit" },
      { kind: "sleep", title: "Kawaramachi base", area: "Central", note: "เดินกินเที่ยวสะดวก", signal: "ใจกลางเมือง" },
    ],
  },
  {
    name: "Sapporo",
    japaneseName: "札幌",
    prefecture: "Hokkaido",
    lat: 43.0618,
    lon: 141.3545,
    heroTone: "from-blue-600 via-sky-300 to-slate-100",
    crowdBaseline: 52,
    recommendations: [
      { kind: "see", title: "Odori Park", area: "Odori", note: "เช็คอุณหภูมิและลมก่อนเดินยาว", signal: "พื้นที่เปิด" },
      { kind: "see", title: "Moerenuma Park", area: "Higashi", note: "เหมาะวันที่ท้องฟ้าเปิด", signal: "กลางแจ้ง" },
      { kind: "eat", title: "Ramen Yokocho", area: "Susukino", note: "ดีเมื่ออากาศเย็นหรือหิมะตก", signal: "อบอุ่น" },
      { kind: "eat", title: "Nijo Market", area: "Chuo", note: "เหมาะช่วงเช้า", signal: "seafood" },
      { kind: "sleep", title: "Sapporo Station base", area: "Kita", note: "เหมาะต่อรถและรับมือหิมะ", signal: "สะดวก" },
      { kind: "sleep", title: "Susukino base", area: "Chuo", note: "เหมาะสายกินกลางคืน", signal: "nightlife" },
    ],
  },
  {
    name: "Nagoya",
    japaneseName: "名古屋",
    prefecture: "Aichi",
    lat: 35.1815,
    lon: 136.9066,
    heroTone: "from-cyan-600 via-blue-200 to-lime-100",
    crowdBaseline: 61,
    recommendations: [
      { kind: "see", title: "Nagoya Castle", area: "Naka", note: "เหมาะช่วงแดดไม่แรง", signal: "แลนด์มาร์ก" },
      { kind: "see", title: "Sakae", area: "Sakae", note: "เดินเมืองและช้อปได้แม้ฝนมา", signal: "เมือง" },
      { kind: "eat", title: "Hitsumabushi", area: "Sakae / Meieki", note: "มื้อจริงจังเมื่ออยากพักขา", signal: "local classic" },
      { kind: "eat", title: "Miso katsu", area: "Central", note: "หาง่ายและอิ่มเร็ว", signal: "comfort food" },
      { kind: "sleep", title: "Meieki base", area: "Nagoya Station", note: "เหมาะต่อ Shinkansen", signal: "rail hub" },
      { kind: "sleep", title: "Sakae base", area: "Sakae", note: "เหมาะเดินกินช้อป", signal: "central" },
    ],
  },
  {
    name: "Yokohama",
    japaneseName: "横浜",
    prefecture: "Kanagawa",
    lat: 35.4437,
    lon: 139.638,
    heroTone: "from-sky-700 via-cyan-300 to-pink-200",
    crowdBaseline: 64,
    recommendations: [
      { kind: "see", title: "Minato Mirai", area: "Bay area", note: "เช็คลมก่อนเดินริมน้ำ", signal: "วิวอ่าว" },
      { kind: "see", title: "Sankeien Garden", area: "Honmoku", note: "เหมาะวันฟ้าเปิด", signal: "สวน" },
      { kind: "eat", title: "Yokohama Chinatown", area: "Motomachi", note: "มีตัวเลือกในร่มเยอะ", signal: "ดีเมื่อฝนมา" },
      { kind: "eat", title: "Red Brick Warehouse", area: "Shinko", note: "กินและหลบอากาศได้ง่าย", signal: "indoor/outdoor" },
      { kind: "sleep", title: "Sakuragicho base", area: "Minato Mirai", note: "วิวดีและเดินเล่นสะดวก", signal: "scenic" },
      { kind: "sleep", title: "Yokohama Station base", area: "Nishi", note: "เหมาะต่อรถไป Tokyo", signal: "transit" },
    ],
  },
  {
    name: "Nara",
    japaneseName: "奈良",
    prefecture: "Nara",
    lat: 34.6851,
    lon: 135.8048,
    heroTone: "from-green-600 via-lime-200 to-yellow-100",
    crowdBaseline: 56,
    recommendations: [
      { kind: "see", title: "Nara Park", area: "Central Nara", note: "เช็คฝนก่อน เพราะเดินกลางแจ้งเยอะ", signal: "พื้นที่เปิด" },
      { kind: "see", title: "Todai-ji", area: "Nara Park", note: "แลนด์มาร์กหลักที่จัดเวลาง่าย", signal: "วัดสำคัญ" },
      { kind: "eat", title: "Higashimuki Shopping Street", area: "Near station", note: "ตัวเลือกง่ายและใกล้รถไฟ", signal: "สะดวก" },
      { kind: "eat", title: "Kakinoha-zushi", area: "Central", note: "ลองอาหารท้องถิ่นแบบเบา ๆ", signal: "local" },
      { kind: "sleep", title: "Kintetsu Nara base", area: "Station area", note: "เหมาะเดินเข้าสวนและวัด", signal: "walkable" },
      { kind: "sleep", title: "JR Nara base", area: "Station area", note: "เหมาะ day trip ต่อเมืองอื่น", signal: "rail" },
    ],
  },
  {
    name: "Kobe",
    japaneseName: "神戸",
    prefecture: "Hyogo",
    lat: 34.6901,
    lon: 135.1955,
    heroTone: "from-cyan-700 via-sky-300 to-rose-100",
    crowdBaseline: 57,
    recommendations: [
      { kind: "see", title: "Harborland", area: "Bay", note: "เหมาะเย็นที่ลมไม่แรง", signal: "ริมน้ำ" },
      { kind: "see", title: "Kitano", area: "Kita ward", note: "เดินเนิน ควรเช็คฝนและความร้อน", signal: "เดินเมือง" },
      { kind: "eat", title: "Kobe beef lunch", area: "Sannomiya", note: "จองง่ายกว่ามื้อเย็น", signal: "local premium" },
      { kind: "eat", title: "Nankinmachi", area: "Motomachi", note: "กินเล่นและหลบฝนได้บางส่วน", signal: "street food" },
      { kind: "sleep", title: "Sannomiya base", area: "Central", note: "เหมาะต่อรถและกินเที่ยว", signal: "central" },
      { kind: "sleep", title: "Harborland base", area: "Bay", note: "เหมาะวิวกลางคืน", signal: "scenic" },
    ],
  },
  {
    name: "Hiroshima",
    japaneseName: "広島",
    prefecture: "Hiroshima",
    lat: 34.3853,
    lon: 132.4553,
    heroTone: "from-sky-600 via-teal-200 to-orange-100",
    crowdBaseline: 55,
    recommendations: [
      { kind: "see", title: "Peace Memorial Park", area: "Naka", note: "เดินกลางแจ้ง ควรเช็คฝน", signal: "แลนด์มาร์ก" },
      { kind: "see", title: "Miyajima day trip", area: "Miyajima", note: "เช็คลมและฝนก่อนขึ้นเรือ", signal: "day trip" },
      { kind: "eat", title: "Okonomimura", area: "Shintenchi", note: "ดีเมื่ออยากกิน local แบบชัดเจน", signal: "ในร่ม" },
      { kind: "eat", title: "Oyster dishes", area: "Central", note: "เหมาะมื้อเย็นสบาย ๆ", signal: "seafood" },
      { kind: "sleep", title: "Hiroshima Station base", area: "Minami", note: "เหมาะ day trip", signal: "transit" },
      { kind: "sleep", title: "Hondori base", area: "Naka", note: "เดินกินเที่ยวสะดวก", signal: "central" },
    ],
  },
  {
    name: "Kanazawa",
    japaneseName: "金沢",
    prefecture: "Ishikawa",
    lat: 36.5613,
    lon: 136.6562,
    heroTone: "from-emerald-700 via-cyan-200 to-stone-100",
    crowdBaseline: 49,
    recommendations: [
      { kind: "see", title: "Kenrokuen", area: "Central", note: "สวนเด่นมากเมื่อฝนน้อย", signal: "สวน" },
      { kind: "see", title: "Higashi Chaya", area: "Higashiyama", note: "เดินถ่ายรูปสั้น ๆ ได้ดี", signal: "ย่านเก่า" },
      { kind: "eat", title: "Omicho Market", area: "Central", note: "เหมาะช่วงเช้าถึงเที่ยง", signal: "seafood" },
      { kind: "eat", title: "Kanazawa curry", area: "Station/Central", note: "ทางเลือกอุ่น ๆ วันที่ฝนมา", signal: "comfort" },
      { kind: "sleep", title: "Kanazawa Station base", area: "Station", note: "เหมาะต่อรถและฝากกระเป๋า", signal: "rail" },
      { kind: "sleep", title: "Korinbo base", area: "Central", note: "ใกล้สวนและย่านเก่า", signal: "walkable" },
    ],
  },
  {
    name: "Takayama",
    japaneseName: "高山",
    prefecture: "Gifu",
    lat: 36.1461,
    lon: 137.2522,
    heroTone: "from-green-700 via-emerald-300 to-amber-100",
    crowdBaseline: 43,
    recommendations: [
      { kind: "see", title: "Sanmachi Suji", area: "Old town", note: "เดินเช้าเพื่อหลบคนและแดด", signal: "ย่านเก่า" },
      { kind: "see", title: "Miyagawa Morning Market", area: "Riverside", note: "เหมาะเช้าเมื่อฝนไม่หนัก", signal: "ตลาดเช้า" },
      { kind: "eat", title: "Hida beef skewers", area: "Old town", note: "กินง่ายระหว่างเดิน", signal: "local" },
      { kind: "eat", title: "Takayama ramen", area: "Central", note: "เหมาะวันที่อากาศเย็น", signal: "warm meal" },
      { kind: "sleep", title: "Takayama Station base", area: "Station", note: "สะดวกต่อรถบัส Shirakawa-go", signal: "bus hub" },
      { kind: "sleep", title: "Old town ryokan", area: "Central", note: "เหมาะพักช้า ๆ", signal: "local stay" },
    ],
  },
  {
    name: "Kawaguchiko",
    japaneseName: "河口湖",
    prefecture: "Yamanashi",
    lat: 35.5171,
    lon: 138.7518,
    heroTone: "from-blue-700 via-sky-300 to-lime-100",
    crowdBaseline: 63,
    livecam: { title: "Mt. Fuji live camera search", source: "Public Fuji livecam listings", url: "https://www.youtube.com/results?search_query=kawaguchiko+mt+fuji+live+camera" },
    recommendations: [
      { kind: "see", title: "Lake Kawaguchi north shore", area: "North shore", note: "ดีที่สุดเมื่อเมฆน้อยและลมไม่แรง", signal: "วิว Fuji" },
      { kind: "see", title: "Oishi Park", area: "North shore", note: "เช็คกล้องก่อนออกไปดู Fuji", signal: "photo spot" },
      { kind: "eat", title: "Hoto noodles", area: "Around lake", note: "เหมาะวันเย็นหรือฝนมา", signal: "local warm dish" },
      { kind: "eat", title: "Cafe near lake", area: "Lakefront", note: "เลือกเมื่อวิวเปิด", signal: "วิว" },
      { kind: "sleep", title: "Lake view ryokan", area: "North shore", note: "คุ้มเมื่อพยากรณ์ฟ้าเปิด", signal: "วิว Fuji" },
      { kind: "sleep", title: "Station base", area: "Kawaguchiko Station", note: "เหมาะเดินทางด้วย bus/train", signal: "transit" },
    ],
  },
  {
    name: "Hakone",
    japaneseName: "箱根",
    prefecture: "Kanagawa",
    lat: 35.2324,
    lon: 139.1069,
    heroTone: "from-teal-700 via-green-300 to-rose-100",
    crowdBaseline: 59,
    recommendations: [
      { kind: "see", title: "Lake Ashi", area: "Moto-Hakone", note: "เช็คลมและหมอกก่อนเดินริมน้ำ", signal: "วิวภูเขา" },
      { kind: "see", title: "Open-Air Museum", area: "Chokoku-no-Mori", note: "เหมาะวันที่ฝนไม่หนัก", signal: "กลางแจ้ง" },
      { kind: "eat", title: "Onsen town meals", area: "Gora/Yumoto", note: "เหมาะหลังแช่ออนเซ็น", signal: "relaxed" },
      { kind: "eat", title: "Bakery/cafe by route", area: "Hakone-Yumoto", note: "ดีวันอากาศไม่นิ่ง", signal: "easy stop" },
      { kind: "sleep", title: "Gora ryokan", area: "Gora", note: "เหมาะพักออนเซ็น", signal: "onsen" },
      { kind: "sleep", title: "Hakone-Yumoto base", area: "Yumoto", note: "เดินทางง่ายกว่าเมื่ออากาศแปรปรวน", signal: "access" },
    ],
  },
  {
    name: "Naha",
    japaneseName: "那覇",
    prefecture: "Okinawa",
    lat: 26.2124,
    lon: 127.6792,
    heroTone: "from-cyan-500 via-teal-200 to-orange-100",
    crowdBaseline: 54,
    recommendations: [
      { kind: "see", title: "Kokusai Dori", area: "Central", note: "เดินง่ายและหลบฝนได้บางช่วง", signal: "เมือง" },
      { kind: "see", title: "Shurijo area", area: "Shuri", note: "เช็คความร้อนและฝนก่อนขึ้นเนิน", signal: "ประวัติศาสตร์" },
      { kind: "eat", title: "Okinawa soba", area: "Central", note: "มื้อง่ายและชัดเจนท้องถิ่น", signal: "local" },
      { kind: "eat", title: "Makishi Public Market", area: "Makishi", note: "ดีเมื่ออยากหลบแดด", signal: "ในร่ม" },
      { kind: "sleep", title: "Kokusai Dori base", area: "Central", note: "เหมาะกินเที่ยวไม่ต้องขับรถ", signal: "walkable" },
      { kind: "sleep", title: "Omoromachi base", area: "Shintoshin", note: "เหมาะช้อปและต่อ monorail", signal: "monorail" },
    ],
  },
  {
    name: "Kamakura",
    japaneseName: "鎌倉",
    prefecture: "Kanagawa",
    lat: 35.3192,
    lon: 139.5467,
    heroTone: "from-teal-600 via-cyan-200 to-rose-100",
    crowdBaseline: 66,
    recommendations: quickRecommendations({
      see: [["Tsurugaoka Hachimangu", "Central", "shrine"], ["Hase coast walk", "Hase", "sea breeze"]],
      eat: [["Komachi-dori snacks", "Kamakura Station", "street food"], ["Shirasu bowls", "Coast area", "local seafood"]],
      sleep: [["Kamakura Station base", "Central", "walkable"], ["Enoshima coast stay", "Coast", "sea view"]],
    }),
  },
  {
    name: "Nikko",
    japaneseName: "日光",
    prefecture: "Tochigi",
    lat: 36.7198,
    lon: 139.6982,
    heroTone: "from-emerald-700 via-lime-200 to-amber-100",
    crowdBaseline: 55,
    recommendations: quickRecommendations({
      see: [["Toshogu Shrine", "Nikko", "heritage"], ["Lake Chuzenji", "Oku-Nikko", "mountain lake"]],
      eat: [["Yuba dishes", "Nikko", "local"], ["Station cafe stops", "Nikko Station", "easy stop"]],
      sleep: [["Nikko Station base", "Station", "rail"], ["Chuzenji onsen stay", "Lake area", "onsen"]],
    }),
  },
  {
    name: "Matsumoto",
    japaneseName: "松本",
    prefecture: "Nagano",
    lat: 36.238,
    lon: 137.972,
    heroTone: "from-slate-700 via-sky-200 to-amber-100",
    crowdBaseline: 47,
    recommendations: quickRecommendations({
      see: [["Matsumoto Castle", "Central", "landmark"], ["Nawate Street", "Central", "old town"]],
      eat: [["Soba lunch", "Central", "local"], ["Basashi restaurants", "Station area", "regional"]],
      sleep: [["Matsumoto Station base", "Station", "rail"], ["Asama Onsen stay", "Onsen area", "onsen"]],
    }),
  },
  {
    name: "Nagano",
    japaneseName: "長野",
    prefecture: "Nagano",
    lat: 36.6486,
    lon: 138.1948,
    heroTone: "from-green-700 via-emerald-200 to-sky-100",
    crowdBaseline: 45,
    recommendations: quickRecommendations({
      see: [["Zenko-ji", "Central", "temple"], ["Togakushi day trip", "Togakushi", "nature"]],
      eat: [["Shinshu soba", "Central", "local"], ["Oyaki shops", "Near Zenko-ji", "snack"]],
      sleep: [["Nagano Station base", "Station", "rail"], ["Zenko-ji area stay", "Central", "quiet"]],
    }),
  },
  {
    name: "Sendai",
    japaneseName: "仙台",
    prefecture: "Miyagi",
    lat: 38.2682,
    lon: 140.8694,
    heroTone: "from-sky-700 via-cyan-200 to-lime-100",
    crowdBaseline: 52,
    recommendations: quickRecommendations({
      see: [["Jozenji-dori", "Aoba", "city walk"], ["Zuihoden", "Aoba", "history"]],
      eat: [["Gyutan", "Station / Ichibancho", "local classic"], ["Zunda sweets", "Central", "snack"]],
      sleep: [["Sendai Station base", "Station", "rail"], ["Ichibancho base", "Central", "dining"]],
    }),
  },
  {
    name: "Kagoshima",
    japaneseName: "鹿児島",
    prefecture: "Kagoshima",
    lat: 31.5966,
    lon: 130.5571,
    heroTone: "from-orange-600 via-amber-200 to-sky-100",
    crowdBaseline: 49,
    livecam: { title: "Sakurajima live camera search", source: "Public livecam listings", url: "https://www.youtube.com/results?search_query=sakurajima+live+camera" },
    recommendations: quickRecommendations({
      see: [["Sakurajima ferry", "Port", "volcano"], ["Sengan-en", "Iso", "garden"]],
      eat: [["Kurobuta tonkatsu", "Tenmonkan", "local"], ["Shirokuma dessert", "Tenmonkan", "sweet"]],
      sleep: [["Kagoshima-Chuo base", "Station", "rail"], ["Tenmonkan base", "Central", "food"]],
    }),
  },
  {
    name: "Beppu",
    japaneseName: "別府",
    prefecture: "Oita",
    lat: 33.2846,
    lon: 131.4912,
    heroTone: "from-cyan-700 via-teal-200 to-amber-100",
    crowdBaseline: 48,
    recommendations: quickRecommendations({
      see: [["Hells of Beppu", "Kannawa", "onsen sights"], ["Beppu ropeway", "Mount Tsurumi", "view"]],
      eat: [["Jigoku-mushi", "Kannawa", "steam food"], ["Toriten", "Central", "local"]],
      sleep: [["Beppu Station base", "Station", "rail"], ["Kannawa onsen stay", "Kannawa", "onsen"]],
    }),
  },
  {
    name: "Kumamoto",
    japaneseName: "熊本",
    prefecture: "Kumamoto",
    lat: 32.8031,
    lon: 130.7079,
    heroTone: "from-stone-700 via-lime-200 to-amber-100",
    crowdBaseline: 50,
    recommendations: quickRecommendations({
      see: [["Kumamoto Castle", "Central", "landmark"], ["Suizenji Garden", "Suizenji", "garden"]],
      eat: [["Kumamoto ramen", "Central", "local"], ["Basashi", "Shimotori", "regional"]],
      sleep: [["Kumamoto Station base", "Station", "rail"], ["Shimotori base", "Central", "dining"]],
    }),
  },
  {
    name: "Miyajima",
    japaneseName: "宮島",
    prefecture: "Hiroshima",
    lat: 34.2959,
    lon: 132.3199,
    heroTone: "from-red-600 via-orange-200 to-sky-100",
    crowdBaseline: 64,
    recommendations: quickRecommendations({
      see: [["Itsukushima Shrine", "Miyajima", "heritage"], ["Mount Misen", "Miyajima", "hike/view"]],
      eat: [["Grilled oysters", "Omotesando", "seafood"], ["Momiji manju", "Omotesando", "sweet"]],
      sleep: [["Miyajima ryokan", "Island", "quiet"], ["Miyajimaguchi base", "Ferry pier", "access"]],
    }),
  },
  {
    name: "Ishigaki",
    japaneseName: "石垣",
    prefecture: "Okinawa",
    lat: 24.3407,
    lon: 124.1556,
    heroTone: "from-cyan-600 via-sky-200 to-lime-100",
    crowdBaseline: 46,
    recommendations: quickRecommendations({
      see: [["Kabira Bay", "Northwest", "sea view"], ["Ishigaki Yaima Village", "Nagura", "culture"]],
      eat: [["Yaeyama soba", "Central", "local"], ["Ishigaki beef", "Central", "local premium"]],
      sleep: [["Ferry terminal base", "Central", "island hop"], ["Kabira coast stay", "Kabira", "beach"]],
    }),
  },
  {
    name: "Matsuyama",
    japaneseName: "松山",
    prefecture: "Ehime",
    lat: 33.8392,
    lon: 132.7657,
    heroTone: "from-orange-600 via-amber-200 to-cyan-100",
    crowdBaseline: 44,
    recommendations: quickRecommendations({
      see: [["Matsuyama Castle", "Central", "landmark"], ["Dogo Onsen area", "Dogo", "onsen town"]],
      eat: [["Taimeshi", "Central / Dogo", "local"], ["Mikan sweets", "Central", "local fruit"]],
      sleep: [["Dogo Onsen stay", "Dogo", "onsen"], ["Matsuyama Station base", "Station", "rail"]],
    }),
  },
  {
    name: "Okayama",
    japaneseName: "岡山",
    prefecture: "Okayama",
    lat: 34.6551,
    lon: 133.9195,
    heroTone: "from-sky-600 via-blue-200 to-yellow-100",
    crowdBaseline: 48,
    recommendations: quickRecommendations({
      see: [["Korakuen Garden", "Central", "garden"], ["Okayama Castle", "Central", "landmark"]],
      eat: [["Demi-katsudon", "Central", "local"], ["Fruit parfait", "Station/Central", "local fruit"]],
      sleep: [["Okayama Station base", "Station", "rail"], ["Castle area stay", "Central", "walkable"]],
    }),
  },
  {
    name: "Kurashiki",
    japaneseName: "倉敷",
    prefecture: "Okayama",
    lat: 34.585,
    lon: 133.7719,
    heroTone: "from-indigo-600 via-sky-200 to-stone-100",
    crowdBaseline: 47,
    recommendations: quickRecommendations({
      see: [["Bikan Historical Quarter", "Central", "old town"], ["Ohara Museum area", "Bikan", "art"]],
      eat: [["Kurashiki cafes", "Bikan", "cafe"], ["Okayama fruit sweets", "Central", "sweet"]],
      sleep: [["Kurashiki Station base", "Station", "rail"], ["Bikan area stay", "Old town", "scenic"]],
    }),
  },
  {
    name: "Takamatsu",
    japaneseName: "高松",
    prefecture: "Kagawa",
    lat: 34.3428,
    lon: 134.0466,
    heroTone: "from-teal-700 via-sky-200 to-amber-100",
    crowdBaseline: 45,
    recommendations: quickRecommendations({
      see: [["Ritsurin Garden", "Central", "garden"], ["Port island ferries", "Port", "island hop"]],
      eat: [["Sanuki udon", "Citywide", "local"], ["Seafood izakaya", "Port/Central", "seafood"]],
      sleep: [["Takamatsu Station base", "Station", "ferry/rail"], ["Kawaramachi base", "Central", "food"]],
    }),
  },
  {
    name: "Aomori",
    japaneseName: "青森",
    prefecture: "Aomori",
    lat: 40.8222,
    lon: 140.7474,
    heroTone: "from-blue-700 via-sky-200 to-lime-100",
    crowdBaseline: 42,
    recommendations: quickRecommendations({
      see: [["Nebuta Museum WA RASSE", "Station", "indoor"], ["A-FACTORY waterfront", "Bay", "waterfront"]],
      eat: [["Nokkedon", "Furukawa Market", "seafood"], ["Apple sweets", "Station/Bay", "local fruit"]],
      sleep: [["Aomori Station base", "Station", "rail"], ["Bay area stay", "Waterfront", "walkable"]],
    }),
  },
  {
    name: "Hakodate",
    japaneseName: "函館",
    prefecture: "Hokkaido",
    lat: 41.7687,
    lon: 140.7291,
    heroTone: "from-slate-700 via-sky-200 to-rose-100",
    crowdBaseline: 49,
    recommendations: quickRecommendations({
      see: [["Mount Hakodate", "Ropeway", "night view"], ["Motomachi slope walk", "Motomachi", "historic"]],
      eat: [["Morning Market seafood", "Station", "seafood"], ["Lucky Pierrot", "Citywide", "local casual"]],
      sleep: [["Hakodate Station base", "Station", "rail"], ["Yunokawa onsen stay", "Yunokawa", "onsen"]],
    }),
  },
  {
    name: "Otaru",
    japaneseName: "小樽",
    prefecture: "Hokkaido",
    lat: 43.1907,
    lon: 140.9947,
    heroTone: "from-cyan-700 via-sky-200 to-stone-100",
    crowdBaseline: 52,
    recommendations: quickRecommendations({
      see: [["Otaru Canal", "Central", "canal"], ["Sakaimachi Street", "Central", "glass/cafes"]],
      eat: [["Sushi street", "Central", "seafood"], ["LeTAO sweets", "Sakaimachi", "sweet"]],
      sleep: [["Otaru Station base", "Station", "rail"], ["Canal area stay", "Central", "scenic"]],
    }),
  },
  {
    name: "Asahikawa",
    japaneseName: "旭川",
    prefecture: "Hokkaido",
    lat: 43.7706,
    lon: 142.365,
    heroTone: "from-blue-800 via-sky-200 to-stone-100",
    crowdBaseline: 39,
    recommendations: quickRecommendations({
      see: [["Asahiyama Zoo", "East", "family"], ["Tokiwa Park", "Central", "park"]],
      eat: [["Asahikawa ramen", "Central", "local"], ["Jingisukan", "Central", "warm meal"]],
      sleep: [["Asahikawa Station base", "Station", "rail"], ["Central hotel base", "Downtown", "dining"]],
    }),
  },
  {
    name: "Shizuoka",
    japaneseName: "静岡",
    prefecture: "Shizuoka",
    lat: 34.9756,
    lon: 138.3828,
    heroTone: "from-green-700 via-lime-200 to-sky-100",
    crowdBaseline: 46,
    recommendations: quickRecommendations({
      see: [["Miho no Matsubara", "Shimizu", "Fuji view"], ["Nihondaira", "Shimizu", "view"]],
      eat: [["Shizuoka oden", "Central", "local"], ["Sakura shrimp dishes", "Shimizu", "seafood"]],
      sleep: [["Shizuoka Station base", "Station", "rail"], ["Shimizu base", "Port", "seafood"]],
    }),
  },
  {
    name: "Atami",
    japaneseName: "熱海",
    prefecture: "Shizuoka",
    lat: 35.0955,
    lon: 139.0717,
    heroTone: "from-rose-600 via-orange-200 to-sky-100",
    crowdBaseline: 58,
    recommendations: quickRecommendations({
      see: [["Atami Sun Beach", "Coast", "beach"], ["MOA Museum of Art", "Hillside", "indoor"]],
      eat: [["Seafood bowls", "Station/Coast", "seafood"], ["Onsen manju", "Station", "sweet"]],
      sleep: [["Atami Station base", "Station", "rail"], ["Seafront ryokan", "Coast", "onsen view"]],
    }),
  },
  {
    name: "Izu",
    japaneseName: "伊豆",
    prefecture: "Shizuoka",
    lat: 34.9766,
    lon: 138.9468,
    heroTone: "from-teal-700 via-cyan-200 to-orange-100",
    crowdBaseline: 44,
    recommendations: quickRecommendations({
      see: [["Jogasaki Coast", "Ito", "coast walk"], ["Shuzenji Onsen", "Central Izu", "onsen town"]],
      eat: [["Wasabi dishes", "Central Izu", "local"], ["Kinmedai seafood", "Coast", "seafood"]],
      sleep: [["Shuzenji stay", "Central Izu", "onsen"], ["Ito coast base", "Ito", "sea access"]],
    }),
  },
  {
    name: "Himeji",
    japaneseName: "姫路",
    prefecture: "Hyogo",
    lat: 34.8151,
    lon: 134.6854,
    heroTone: "from-slate-700 via-sky-200 to-amber-100",
    crowdBaseline: 53,
    recommendations: quickRecommendations({
      see: [["Himeji Castle", "Central", "heritage"], ["Koko-en Garden", "Castle area", "garden"]],
      eat: [["Anago dishes", "Central", "local"], ["Station ekiben", "Station", "quick meal"]],
      sleep: [["Himeji Station base", "Station", "rail"], ["Castle view stay", "Central", "view"]],
    }),
  },
  {
    name: "Wakayama",
    japaneseName: "和歌山",
    prefecture: "Wakayama",
    lat: 34.2304,
    lon: 135.1708,
    heroTone: "from-green-700 via-cyan-200 to-amber-100",
    crowdBaseline: 40,
    recommendations: quickRecommendations({
      see: [["Wakayama Castle", "Central", "landmark"], ["Kimiidera", "Coast side", "temple"]],
      eat: [["Wakayama ramen", "Central", "local"], ["Kishu ume snacks", "Station", "local"]],
      sleep: [["Wakayama Station base", "Station", "rail"], ["Wakayama-shi base", "Central", "access"]],
    }),
  },
  {
    name: "Koyasan",
    japaneseName: "高野山",
    prefecture: "Wakayama",
    lat: 34.2123,
    lon: 135.5848,
    heroTone: "from-emerald-800 via-lime-200 to-stone-100",
    crowdBaseline: 38,
    recommendations: quickRecommendations({
      see: [["Okunoin", "Koyasan", "sacred walk"], ["Kongobu-ji", "Koyasan", "temple"]],
      eat: [["Shojin ryori", "Temple lodging", "vegetarian"], ["Koya tofu dishes", "Koyasan", "local"]],
      sleep: [["Shukubo temple stay", "Koyasan", "temple"], ["Cable car access base", "Gokurakubashi", "access"]],
    }),
  },
  {
    name: "Karuizawa",
    japaneseName: "軽井沢",
    prefecture: "Nagano",
    lat: 36.3484,
    lon: 138.596,
    heroTone: "from-lime-700 via-green-200 to-sky-100",
    crowdBaseline: 57,
    recommendations: quickRecommendations({
      see: [["Kumoba Pond", "Central", "nature"], ["Old Karuizawa Ginza", "Old town", "shopping"]],
      eat: [["Bakery breakfast", "Old Karuizawa", "cafe"], ["Soba lunch", "Central", "local"]],
      sleep: [["Karuizawa Station base", "Station", "rail"], ["Forest resort stay", "South/Old town", "quiet"]],
    }),
  },
  {
    name: "Yufuin",
    japaneseName: "由布院",
    prefecture: "Oita",
    lat: 33.2669,
    lon: 131.3545,
    heroTone: "from-emerald-700 via-teal-200 to-amber-100",
    crowdBaseline: 45,
    recommendations: quickRecommendations({
      see: [["Kinrin Lake", "Yufuin", "lake"], ["Yunotsubo Street", "Central", "walk"]],
      eat: [["Bungo beef", "Central", "local"], ["Cafe sweets", "Yunotsubo", "cafe"]],
      sleep: [["Yufuin ryokan", "Central", "onsen"], ["Station area base", "Yufuin Station", "access"]],
    }),
  },
];

export const cityConfigs: CityConfig[] = rawConfigs.map((city) => ({
  ...city,
  slug: slugifyCity(city.name),
}));

export function getCityConfigBySlug(slug: string) {
  return cityConfigs.find((city) => city.slug === slugifyCity(slug));
}

export function getCityConfigByName(name: string) {
  const normalized = slugifyCity(name);
  return cityConfigs.find(
    (city) =>
      city.slug === normalized ||
      slugifyCity(city.japaneseName) === normalized ||
      slugifyCity(`${city.name} ${city.prefecture}`) === normalized,
  );
}
