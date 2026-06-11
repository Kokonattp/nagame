export type TransitStop = {
  name: string;
  lat: number;
  lon: number;
};

export type TransitLineKind = "subway" | "jr" | "tram" | "bus";

export type TransitLine = {
  id: string;
  name: string;
  kind: TransitLineKind;
  color: string;
  to: string;
  note: string;
  // ระบุเมื่อจุดขึ้นรถไม่ใช่สถานีหลัก เช่น รถรางที่ต้องเดินไปขึ้นแถว Odori
  boardAt?: string;
  stops: TransitStop[];
};

export type CityTransit = {
  station: {
    name: string;
    nameJa?: string;
    lat: number;
    lon: number;
  };
  description: string;
  lines: TransitLine[];
};

// เส้นทางคัดมือรายเมือง — พิกัดป้าย/สถานีเป็นค่าโดยประมาณสำหรับวาดแผนที่
// ไม่ใช่ข้อมูลเดินรถเรียลไทม์ จึงใส่เฉพาะป้ายหลักที่นักท่องเที่ยวใช้จริง
const transitByCity: Record<string, CityTransit> = {
  sapporo: {
    station: {
      name: "Sapporo Station",
      nameJa: "札幌駅",
      lat: 43.0686,
      lon: 141.3508,
    },
    description:
      "สายหลักที่ออกจากสถานี Sapporo ครอบคลุมย่านเที่ยวเกือบทั้งหมด — ใต้ดิน 3 สาย, JR ไปสนามบินและ Otaru, รถรางสำหรับวิว Mt. Moiwa และบัสสายเที่ยวยอดนิยม",
    lines: [
      {
        id: "namboku",
        name: "Subway Namboku Line",
        kind: "subway",
        color: "#2e8b57",
        to: "Odori • Susukino • Nakajima Park",
        note: "สายเขียว แกนหลักของเมือง ลงย่านกิน-เที่ยวกลางคืนได้ใน 2-3 สถานี",
        stops: [
          { name: "Asabu", lat: 43.0907, lon: 141.3361 },
          { name: "Kita-24-jo", lat: 43.0782, lon: 141.3409 },
          { name: "Sapporo", lat: 43.0686, lon: 141.3507 },
          { name: "Odori", lat: 43.0607, lon: 141.3545 },
          { name: "Susukino", lat: 43.0553, lon: 141.3534 },
          { name: "Nakajima-Koen", lat: 43.0488, lon: 141.3537 },
          { name: "Makomanai", lat: 42.9886, lon: 141.3528 },
        ],
      },
      {
        id: "toho",
        name: "Subway Toho Line",
        kind: "subway",
        color: "#1e9ad6",
        to: "Odori • Hosui-Susukino • Fukuzumi",
        note: "สายฟ้า ไป Sapporo Dome (Fukuzumi) และฝั่งตะวันออกของเมือง",
        stops: [
          { name: "Sakaemachi", lat: 43.1054, lon: 141.3784 },
          { name: "Kanjo-dori-higashi", lat: 43.0789, lon: 141.3645 },
          { name: "Sapporo", lat: 43.0686, lon: 141.3507 },
          { name: "Odori", lat: 43.0607, lon: 141.3545 },
          { name: "Hosui-Susukino", lat: 43.0543, lon: 141.3566 },
          { name: "Fukuzumi", lat: 43.0048, lon: 141.3925 },
        ],
      },
      {
        id: "tozai",
        name: "Subway Tozai Line",
        kind: "subway",
        color: "#e07b39",
        to: "Maruyama Park • Shin-Sapporo",
        boardAt: "ต่อที่ Odori (1 สถานีจาก Sapporo)",
        note: "สายส้ม ไปศาลเจ้า Hokkaido Jingu / สวน Maruyama ฝั่งตะวันตก",
        stops: [
          { name: "Miyanosawa", lat: 43.0808, lon: 141.2768 },
          { name: "Maruyama-Koen", lat: 43.0573, lon: 141.3206 },
          { name: "Odori", lat: 43.0607, lon: 141.3545 },
          { name: "Shin-Sapporo", lat: 43.0392, lon: 141.5078 },
        ],
      },
      {
        id: "jr-airport",
        name: "JR Rapid Airport",
        kind: "jr",
        color: "#a93226",
        to: "New Chitose Airport (~37 นาที)",
        note: "รถด่วนสนามบิน ออกทุก ~12 นาที ซื้อตั๋ว reserved ได้ถ้าอยากนั่งชัวร์",
        stops: [
          { name: "Sapporo", lat: 43.0686, lon: 141.3508 },
          { name: "Shin-Sapporo", lat: 43.0393, lon: 141.5078 },
          { name: "Kita-Hiroshima", lat: 42.9789, lon: 141.5638 },
          { name: "New Chitose Airport", lat: 42.7878, lon: 141.6811 },
        ],
      },
      {
        id: "jr-otaru",
        name: "JR Hakodate Line (Rapid)",
        kind: "jr",
        color: "#34495e",
        to: "Otaru (~35 นาที)",
        note: "Day trip ยอดนิยม วิ่งเลียบทะเลช่วงใกล้ถึง Otaru นั่งฝั่งขวาได้วิว",
        stops: [
          { name: "Sapporo", lat: 43.0686, lon: 141.3508 },
          { name: "Kotoni", lat: 43.0796, lon: 141.303 },
          { name: "Teine", lat: 43.1216, lon: 141.2453 },
          { name: "Zenibako", lat: 43.141, lon: 141.1697 },
          { name: "Minami-Otaru", lat: 43.1869, lon: 141.0119 },
          { name: "Otaru", lat: 43.1914, lon: 140.9939 },
        ],
      },
      {
        id: "tram",
        name: "Sapporo Streetcar (Loop)",
        kind: "tram",
        color: "#8d6e63",
        to: "Ropeway Iriguchi (Mt. Moiwa)",
        boardAt: "ขึ้นที่ Nishi 4-chome (เดิน ~10 นาทีจาก Odori)",
        note: "รถรางวนรอบเมือง ใช้ไปกระเช้า Mt. Moiwa ดูวิวกลางคืน",
        stops: [
          { name: "Nishi 4-chome", lat: 43.0593, lon: 141.3516 },
          { name: "Nishi 15-chome", lat: 43.0586, lon: 141.3338 },
          { name: "Ropeway Iriguchi", lat: 43.0455, lon: 141.3176 },
          { name: "Yamahana 19-jo", lat: 43.0408, lon: 141.3255 },
          { name: "Higashi-Honganji-mae", lat: 43.051, lon: 141.3525 },
          { name: "Susukino (Tram)", lat: 43.0556, lon: 141.3534 },
          { name: "Nishi 4-chome", lat: 43.0593, lon: 141.3516 },
        ],
      },
      {
        id: "loop88",
        name: "Chuo Bus Loop 88 (Factory Line)",
        kind: "bus",
        color: "#b8860b",
        to: "Sapporo Factory • Sapporo Beer Garden",
        note: "บัสวนสายกิน-ช้อป ไปโรงเบียร์ Sapporo และ Sapporo Factory",
        stops: [
          { name: "Sapporo Station", lat: 43.0686, lon: 141.3508 },
          { name: "Sapporo Factory", lat: 43.066, lon: 141.3636 },
          { name: "Sapporo Beer Garden", lat: 43.0717, lon: 141.3667 },
        ],
      },
      {
        id: "kappa-liner",
        name: "Jotetsu Kappa Liner",
        kind: "bus",
        color: "#6c3483",
        to: "Jozankei Onsen (~60-75 นาที)",
        note: "บัสตรงไปออนเซ็น Jozankei วันละหลายรอบ ควรจองที่นั่งล่วงหน้า",
        stops: [
          { name: "Sapporo Station", lat: 43.0686, lon: 141.3508 },
          { name: "Makomanai", lat: 42.9886, lon: 141.3528 },
          { name: "Jozankei Onsen", lat: 42.9698, lon: 141.1665 },
        ],
      },
    ],
  },
  tokyo: {
    station: {
      name: "Tokyo Station",
      nameJa: "東京駅",
      lat: 35.6812,
      lon: 139.7671,
    },
    description:
      "สายที่นักท่องเที่ยวใช้จริงจากสถานี Tokyo — Yamanote วนรอบย่านหลัก, Chuo ผ่ากลางไป Shinjuku, ใต้ดินไป Ginza/Asakusa และรถด่วนสนามบินทั้งสองฝั่ง",
    lines: [
      {
        id: "yamanote",
        name: "JR Yamanote Line",
        kind: "jr",
        color: "#80c241",
        to: "Shibuya • Shinjuku • Ueno (สายวน)",
        note: "สายวนรอบเมือง ครอบคลุมย่านหลักเกือบทั้งหมด รถมาทุก 3-4 นาที",
        stops: [
          { name: "Tokyo", lat: 35.6812, lon: 139.7671 },
          { name: "Shimbashi", lat: 35.6655, lon: 139.7583 },
          { name: "Shinagawa", lat: 35.6285, lon: 139.7387 },
          { name: "Shibuya", lat: 35.658, lon: 139.7016 },
          { name: "Harajuku", lat: 35.6702, lon: 139.7027 },
          { name: "Shinjuku", lat: 35.6896, lon: 139.7006 },
          { name: "Ikebukuro", lat: 35.7295, lon: 139.7109 },
          { name: "Ueno", lat: 35.7141, lon: 139.7774 },
          { name: "Akihabara", lat: 35.6984, lon: 139.7731 },
          { name: "Tokyo", lat: 35.6812, lon: 139.7671 },
        ],
      },
      {
        id: "chuo-rapid",
        name: "JR Chuo Line (Rapid)",
        kind: "jr",
        color: "#f15a22",
        to: "Shinjuku (~14 นาที)",
        note: "ทางลัดผ่ากลางวง Yamanote ไป Shinjuku เร็วกว่านั่งวน",
        stops: [
          { name: "Tokyo", lat: 35.6812, lon: 139.7671 },
          { name: "Ochanomizu", lat: 35.6993, lon: 139.7649 },
          { name: "Yotsuya", lat: 35.686, lon: 139.73 },
          { name: "Shinjuku", lat: 35.6896, lon: 139.7006 },
        ],
      },
      {
        id: "marunouchi",
        name: "Subway Marunouchi Line",
        kind: "subway",
        color: "#f62e36",
        to: "Ginza • Shinjuku",
        note: "ใต้ดินสายแดง ขึ้นจากใต้สถานี Tokyo ตรงไป Ginza แค่สถานีเดียว",
        stops: [
          { name: "Ikebukuro", lat: 35.7295, lon: 139.7109 },
          { name: "Otemachi", lat: 35.6847, lon: 139.764 },
          { name: "Tokyo", lat: 35.6812, lon: 139.7649 },
          { name: "Ginza", lat: 35.6717, lon: 139.764 },
          { name: "Kasumigaseki", lat: 35.674, lon: 139.7507 },
          { name: "Shinjuku", lat: 35.6896, lon: 139.6995 },
        ],
      },
      {
        id: "ginza-line",
        name: "Subway Ginza Line",
        kind: "subway",
        color: "#f39700",
        to: "Asakusa • Shibuya",
        boardAt: "Nihombashi (เดิน ~6 นาทีจาก Tokyo Sta)",
        note: "สายส้มเก่าแก่ เชื่อม Asakusa-Ueno-Ginza-Shibuya ในเส้นเดียว",
        stops: [
          { name: "Asakusa", lat: 35.711, lon: 139.7967 },
          { name: "Ueno", lat: 35.7138, lon: 139.777 },
          { name: "Nihombashi", lat: 35.6822, lon: 139.7745 },
          { name: "Ginza", lat: 35.6717, lon: 139.764 },
          { name: "Shimbashi", lat: 35.6661, lon: 139.7583 },
          { name: "Shibuya", lat: 35.659, lon: 139.701 },
        ],
      },
      {
        id: "nex",
        name: "JR Narita Express (N'EX)",
        kind: "jr",
        color: "#7d3c98",
        to: "Narita Airport (~55 นาที)",
        note: "รถด่วนสนามบินนาริตะ ที่นั่งจองทั้งขบวน ใช้ JR Pass ได้",
        stops: [
          { name: "Tokyo", lat: 35.6812, lon: 139.7671 },
          { name: "Narita Airport", lat: 35.7767, lon: 140.3189 },
        ],
      },
      {
        id: "monorail",
        name: "Tokyo Monorail",
        kind: "jr",
        color: "#16a085",
        to: "Haneda Airport (~15 นาที)",
        boardAt: "Hamamatsucho (JR Yamanote 4 สถานีจาก Tokyo)",
        note: "เส้นทางไปฮาเนดะที่ตรงเวลาสุด วิ่งเลียบอ่าวโตเกียว",
        stops: [
          { name: "Hamamatsucho", lat: 35.6554, lon: 139.7572 },
          { name: "Haneda Airport T3", lat: 35.5494, lon: 139.7798 },
        ],
      },
    ],
  },
  osaka: {
    station: {
      name: "Osaka Station",
      nameJa: "大阪駅 / 梅田",
      lat: 34.7025,
      lon: 135.4959,
    },
    description:
      "จากสถานี Osaka (Umeda) — สายวน JR รอบเมือง, Midosuji ลงใต้สู่ Namba, สายตรง USJ, รถเร็วพิเศษไป Kyoto และเส้นสนามบิน Kansai",
    lines: [
      {
        id: "osaka-loop",
        name: "JR Osaka Loop Line",
        kind: "jr",
        color: "#e67e22",
        to: "Tennoji • Osaka Castle (สายวน)",
        note: "สายวนรอบเมือง ลง Osakajokoen ไปปราสาท / Tennoji ไป Harukas",
        stops: [
          { name: "Osaka", lat: 34.7025, lon: 135.4959 },
          { name: "Kyobashi", lat: 34.6964, lon: 135.5342 },
          { name: "Tsuruhashi", lat: 34.6652, lon: 135.5306 },
          { name: "Tennoji", lat: 34.647, lon: 135.5136 },
          { name: "Shin-Imamiya", lat: 34.6494, lon: 135.5004 },
          { name: "Bentencho", lat: 34.6691, lon: 135.4575 },
          { name: "Nishikujo", lat: 34.6824, lon: 135.4663 },
          { name: "Osaka", lat: 34.7025, lon: 135.4959 },
        ],
      },
      {
        id: "midosuji",
        name: "Subway Midosuji Line",
        kind: "subway",
        color: "#e5171f",
        to: "Shinsaibashi • Namba",
        boardAt: "Umeda (เชื่อมใต้ดินกับ Osaka Sta)",
        note: "เส้นเลือดใหญ่ของเมือง ลงย่านกิน-ช้อป Shinsaibashi/Namba ใน 6-8 นาที",
        stops: [
          { name: "Umeda", lat: 34.7034, lon: 135.498 },
          { name: "Yodoyabashi", lat: 34.6932, lon: 135.501 },
          { name: "Shinsaibashi", lat: 34.675, lon: 135.501 },
          { name: "Namba", lat: 34.6666, lon: 135.5012 },
          { name: "Tennoji", lat: 34.6476, lon: 135.5142 },
        ],
      },
      {
        id: "yumesaki",
        name: "JR Yumesaki Line (Sakurajima)",
        kind: "jr",
        color: "#2980b9",
        to: "Universal Studios Japan (~12 นาที)",
        note: "ขบวนตรง USJ มีเป็นช่วง ๆ ถ้าไม่ตรงให้เปลี่ยนขบวนที่ Nishikujo",
        stops: [
          { name: "Osaka", lat: 34.7025, lon: 135.4959 },
          { name: "Nishikujo", lat: 34.6824, lon: 135.4663 },
          { name: "Universal City", lat: 34.6675, lon: 135.4332 },
        ],
      },
      {
        id: "jr-kyoto-line",
        name: "JR Kyoto Line (Special Rapid)",
        kind: "jr",
        color: "#27ae60",
        to: "Kyoto (~28 นาที)",
        note: "รถเร็วพิเศษไม่ต้องจองที่นั่ง ถี่ทุก ~15 นาที ถูกกว่า Shinkansen",
        stops: [
          { name: "Osaka", lat: 34.7025, lon: 135.4959 },
          { name: "Shin-Osaka", lat: 34.7335, lon: 135.5002 },
          { name: "Takatsuki", lat: 34.8511, lon: 135.6172 },
          { name: "Kyoto", lat: 34.9858, lon: 135.7585 },
        ],
      },
      {
        id: "kanku-rapid",
        name: "JR Kansai Airport Rapid",
        kind: "jr",
        color: "#34495e",
        to: "Kansai Airport (~70 นาที)",
        note: "นั่งยาวถึง KIX ไม่ต้องเปลี่ยน หรือใช้ Haruka จาก Tennoji ถ้ารีบ",
        stops: [
          { name: "Osaka", lat: 34.7025, lon: 135.4959 },
          { name: "Tennoji", lat: 34.647, lon: 135.5136 },
          { name: "Kansai Airport", lat: 34.432, lon: 135.2304 },
        ],
      },
    ],
  },
  kyoto: {
    station: {
      name: "Kyoto Station",
      nameJa: "京都駅",
      lat: 34.9858,
      lon: 135.7585,
    },
    description:
      "วัดดังของ Kyoto กระจายหลายทิศ — ใต้ดินขึ้นเหนือ, JR ไป Fushimi Inari/Uji/Arashiyama และรถบัสประจำทางสำหรับ Kiyomizu, Gion, Kinkakuji",
    lines: [
      {
        id: "karasuma",
        name: "Subway Karasuma Line",
        kind: "subway",
        color: "#27ae60",
        to: "Shijo • Imadegawa",
        note: "แกนเหนือ-ใต้ของเมือง ขึ้นย่านช้อป Shijo และพระราชวัง Gosho",
        stops: [
          { name: "Kyoto", lat: 34.9858, lon: 135.7585 },
          { name: "Shijo", lat: 35.0038, lon: 135.7591 },
          { name: "Karasuma Oike", lat: 35.0107, lon: 135.7596 },
          { name: "Imadegawa", lat: 35.0299, lon: 135.7593 },
          { name: "Kokusaikaikan", lat: 35.0633, lon: 135.7853 },
        ],
      },
      {
        id: "jr-nara",
        name: "JR Nara Line",
        kind: "jr",
        color: "#b7950b",
        to: "Fushimi Inari (2 สถานี) • Uji • Nara",
        note: "ลงสถานี Inari หน้าศาลเจ้าเสาแดงพอดี ต่อยาวได้ถึง Uji และ Nara",
        stops: [
          { name: "Kyoto", lat: 34.9858, lon: 135.7585 },
          { name: "Tofukuji", lat: 34.9763, lon: 135.774 },
          { name: "Inari", lat: 34.9697, lon: 135.7727 },
          { name: "Uji", lat: 34.8901, lon: 135.803 },
          { name: "Nara", lat: 34.6816, lon: 135.82 },
        ],
      },
      {
        id: "sagano",
        name: "JR Sagano Line",
        kind: "jr",
        color: "#7d3c98",
        to: "Arashiyama (~16 นาที)",
        note: "ไปป่าไผ่และสะพาน Togetsukyo ลง Saga-Arashiyama แล้วเดิน ~10 นาที",
        stops: [
          { name: "Kyoto", lat: 34.9858, lon: 135.7585 },
          { name: "Nijo", lat: 35.0107, lon: 135.7426 },
          { name: "Saga-Arashiyama", lat: 35.0188, lon: 135.681 },
        ],
      },
      {
        id: "bus-206",
        name: "City Bus 206",
        kind: "bus",
        color: "#c0392b",
        to: "Kiyomizu-dera • Gion",
        note: "บัสสายหลักฝั่งตะวันออก ลง Gojozaka เดินขึ้นวัดน้ำใส / ลง Gion เดินย่านเกอิชา",
        stops: [
          { name: "Kyoto Station", lat: 34.9858, lon: 135.7585 },
          { name: "Gojozaka", lat: 34.9956, lon: 135.777 },
          { name: "Gion", lat: 35.0037, lon: 135.7755 },
        ],
      },
      {
        id: "bus-205",
        name: "City Bus 205",
        kind: "bus",
        color: "#d35400",
        to: "Kinkakuji",
        note: "ไปวัดทอง ลงป้าย Kinkakuji-michi ใช้เวลา ~40 นาที ช่วงพีคคนแน่น",
        stops: [
          { name: "Kyoto Station", lat: 34.9858, lon: 135.7585 },
          { name: "Shijo-Karasuma", lat: 35.003, lon: 135.759 },
          { name: "Kinkakuji-michi", lat: 35.0375, lon: 135.7298 },
        ],
      },
      {
        id: "haruka",
        name: "JR Haruka Express",
        kind: "jr",
        color: "#2c3e50",
        to: "Kansai Airport (~80 นาที)",
        note: "รถด่วนสนามบินตรงจาก Kyoto ใช้ JR Pass ได้",
        stops: [
          { name: "Kyoto", lat: 34.9858, lon: 135.7585 },
          { name: "Kansai Airport", lat: 34.432, lon: 135.2304 },
        ],
      },
    ],
  },
  fukuoka: {
    station: {
      name: "Hakata Station",
      nameJa: "博多駅",
      lat: 33.5897,
      lon: 130.4207,
    },
    description:
      "Fukuoka คือเมืองที่สนามบินใกล้ใจกลางที่สุดในญี่ปุ่น — ใต้ดิน 2 สถานีถึง Hakata และทุกย่านหลักเรียงอยู่บนสายเดียวกัน",
    lines: [
      {
        id: "kuko-line",
        name: "Subway Kuko (Airport) Line",
        kind: "subway",
        color: "#e67e22",
        to: "Tenjin • Ohori Park | สนามบิน 2 สถานี",
        note: "สายหลักของเมือง สนามบิน-Hakata-Tenjin-สวน Ohori จบในเส้นเดียว",
        stops: [
          { name: "Fukuoka Airport", lat: 33.5846, lon: 130.4514 },
          { name: "Hakata", lat: 33.5897, lon: 130.4207 },
          { name: "Nakasu-Kawabata", lat: 33.5938, lon: 130.4051 },
          { name: "Tenjin", lat: 33.5914, lon: 130.3989 },
          { name: "Ohori-Koen", lat: 33.586, lon: 130.3795 },
        ],
      },
      {
        id: "nanakuma",
        name: "Subway Nanakuma Line",
        kind: "subway",
        color: "#16a085",
        to: "Kushida Shrine • Yakuin",
        note: "ส่วนต่อขยายจาก Hakata ลงศาลเจ้า Kushida และย่านคาเฟ่ Yakuin",
        stops: [
          { name: "Hakata", lat: 33.5897, lon: 130.4207 },
          { name: "Kushida Jinja-mae", lat: 33.5926, lon: 130.4109 },
          { name: "Tenjin-Minami", lat: 33.5876, lon: 130.3989 },
          { name: "Yakuin", lat: 33.5826, lon: 130.394 },
          { name: "Ropponmatsu", lat: 33.579, lon: 130.3713 },
        ],
      },
      {
        id: "tabito",
        name: "Nishitetsu Bus 'Tabito'",
        kind: "bus",
        color: "#6c3483",
        to: "Dazaifu Tenmangu (~45 นาที)",
        note: "บัสตรงไปศาลเจ้า Dazaifu จาก Hakata Bus Terminal ไม่ต้องเปลี่ยนสาย",
        stops: [
          { name: "Hakata Bus Terminal", lat: 33.5904, lon: 130.4205 },
          { name: "Dazaifu", lat: 33.5128, lon: 130.5238 },
        ],
      },
      {
        id: "kagoshima-rapid",
        name: "JR Kagoshima Line (Rapid)",
        kind: "jr",
        color: "#2c3e50",
        to: "Kokura • Mojiko Retro",
        note: "Day trip ขึ้นเหนือ — ปราสาท Kokura และเมืองท่าย้อนยุค Mojiko",
        stops: [
          { name: "Hakata", lat: 33.5897, lon: 130.4207 },
          { name: "Kokura", lat: 33.887, lon: 130.8823 },
          { name: "Mojiko", lat: 33.9481, lon: 130.9619 },
        ],
      },
    ],
  },
  nagoya: {
    station: {
      name: "Nagoya Station",
      nameJa: "名古屋駅",
      lat: 35.1709,
      lon: 136.8815,
    },
    description:
      "จากสถานี Nagoya — ใต้ดินสายเหลืองเข้าย่าน Sakae, Meitetsu ไปสนามบิน Centrair และปราสาท Inuyama, Aonami ไปพิพิธภัณฑ์รถไฟ",
    lines: [
      {
        id: "higashiyama",
        name: "Subway Higashiyama Line",
        kind: "subway",
        color: "#f1c40f",
        to: "Sakae • Higashiyama Zoo",
        note: "สายเหลืองแกนหลัก เข้าย่านกิน-ช้อป Sakae ใน 2 สถานี",
        stops: [
          { name: "Nagoya", lat: 35.1709, lon: 136.8815 },
          { name: "Fushimi", lat: 35.1681, lon: 136.8971 },
          { name: "Sakae", lat: 35.1709, lon: 136.908 },
          { name: "Higashiyama Koen", lat: 35.1565, lon: 136.9784 },
        ],
      },
      {
        id: "meitetsu-airport",
        name: "Meitetsu Airport Line (μSKY)",
        kind: "jr",
        color: "#c0392b",
        to: "Centrair Airport (~28-35 นาที)",
        note: "รถด่วนสนามบิน μSKY จองที่นั่งได้ ออกจากสถานี Meitetsu Nagoya",
        stops: [
          { name: "Meitetsu Nagoya", lat: 35.1689, lon: 136.8839 },
          { name: "Jingu-mae", lat: 35.1265, lon: 136.9077 },
          { name: "Chubu Centrair", lat: 34.8588, lon: 136.8138 },
        ],
      },
      {
        id: "meitetsu-inuyama",
        name: "Meitetsu Inuyama Line",
        kind: "jr",
        color: "#d35400",
        to: "Inuyama Castle (~30 นาที)",
        note: "ไปปราสาทไม้ดั้งเดิมเก่าแก่ที่สุดแห่งหนึ่งของญี่ปุ่น เหมาะ day trip ครึ่งวัน",
        stops: [
          { name: "Meitetsu Nagoya", lat: 35.1689, lon: 136.8839 },
          { name: "Inuyama", lat: 35.3811, lon: 136.9444 },
        ],
      },
      {
        id: "aonami",
        name: "Aonami Line",
        kind: "jr",
        color: "#2980b9",
        to: "SCMAGLEV Railway Park (~24 นาที)",
        note: "ไปพิพิธภัณฑ์รถไฟ Shinkansen/Maglev และ Legoland ที่ปลายสาย Kinjo-futo",
        stops: [
          { name: "Nagoya", lat: 35.1709, lon: 136.8815 },
          { name: "Kinjo-futo", lat: 35.0517, lon: 136.8458 },
        ],
      },
    ],
  },
  hiroshima: {
    station: {
      name: "Hiroshima Station",
      nameJa: "広島駅",
      lat: 34.3973,
      lon: 132.4757,
    },
    description:
      "สองเส้นหลักที่นักท่องเที่ยวใช้: รถรางสายประวัติศาสตร์ลงหน้าโดมปรมาณู กับ JR ไปท่าเรือเฟอร์รีข้ามเกาะ Miyajima — และบัสวนฟรีสำหรับ JR Pass",
    lines: [
      {
        id: "hiroden-2",
        name: "Hiroden Tram Route 2",
        kind: "tram",
        color: "#2e8b57",
        to: "Genbaku Dome • Miyajimaguchi",
        note: "รถรางลงป้ายหน้าโดมปรมาณูได้เลย นั่งยาวถึงท่าเรือ Miyajima ได้แต่ช้ากว่า JR (~70 นาที)",
        stops: [
          { name: "Hiroshima Station", lat: 34.3973, lon: 132.4757 },
          { name: "Hatchobori", lat: 34.3936, lon: 132.4609 },
          { name: "Kamiyacho-higashi", lat: 34.394, lon: 132.457 },
          { name: "Genbaku Dome-mae", lat: 34.3955, lon: 132.4536 },
          { name: "Miyajimaguchi", lat: 34.3122, lon: 132.303 },
        ],
      },
      {
        id: "jr-sanyo",
        name: "JR Sanyo Line",
        kind: "jr",
        color: "#34495e",
        to: "Miyajimaguchi (~28 นาที)",
        note: "วิธีไป Miyajima ที่เร็วสุด ลงแล้วต่อเฟอร์รี JR 10 นาที (JR Pass ใช้ได้รวมเรือ)",
        stops: [
          { name: "Hiroshima", lat: 34.3973, lon: 132.4757 },
          { name: "Yokogawa", lat: 34.4112, lon: 132.4448 },
          { name: "Miyajimaguchi", lat: 34.3128, lon: 132.3027 },
        ],
      },
      {
        id: "meipuru-pu",
        name: "Meipuru-pu Sightseeing Loop Bus",
        kind: "bus",
        color: "#c0392b",
        to: "Peace Park • ปราสาท Hiroshima (สายวน)",
        note: "บัสวนจุดเที่ยวในเมือง คน JR Pass ขึ้นฟรี ออกจากหน้าสถานีฝั่ง Shinkansen",
        stops: [
          { name: "Hiroshima Station", lat: 34.3973, lon: 132.4757 },
          { name: "Hiroshima Castle", lat: 34.4027, lon: 132.4595 },
          { name: "Peace Memorial Park", lat: 34.3917, lon: 132.4521 },
          { name: "Hondori", lat: 34.3925, lon: 132.4596 },
          { name: "Hiroshima Station", lat: 34.3973, lon: 132.4757 },
        ],
      },
    ],
  },
  kamakura: {
    station: {
      name: "Kamakura Station",
      nameJa: "鎌倉駅",
      lat: 35.3192,
      lon: 139.5503,
    },
    description:
      "หัวใจของเมืองคือ Enoden — รถไฟท้องถิ่นเลียบทะเลที่เป็นจุดหมายในตัวเอง บวกเส้นไปวัดฝั่งเหนือและวัดป่าไผ่ฝั่งตะวันออก",
    lines: [
      {
        id: "enoden",
        name: "Enoden (Enoshima Electric Railway)",
        kind: "tram",
        color: "#27ae60",
        to: "Hase (พระใหญ่) • Enoshima",
        note: "ลง Hase ไปพระใหญ่+วัด Hasedera / Kamakurakokomae คือทางตัดรถไฟริมทะเลจาก Slam Dunk",
        stops: [
          { name: "Kamakura", lat: 35.3192, lon: 139.5503 },
          { name: "Hase", lat: 35.3122, lon: 139.5337 },
          { name: "Shichirigahama", lat: 35.3066, lon: 139.5089 },
          { name: "Kamakurakokomae", lat: 35.3066, lon: 139.5005 },
          { name: "Enoshima", lat: 35.31, lon: 139.4847 },
          { name: "Fujisawa", lat: 35.3387, lon: 139.4877 },
        ],
      },
      {
        id: "yokosuka",
        name: "JR Yokosuka Line",
        kind: "jr",
        color: "#2c3e50",
        to: "Kita-Kamakura (วัด Engakuji) • Tokyo",
        note: "1 สถานีถึงโซนวัดเซนฝั่งเหนือ และนั่งยาวกลับ Tokyo ได้ใน ~55 นาที",
        stops: [
          { name: "Kamakura", lat: 35.3192, lon: 139.5503 },
          { name: "Kita-Kamakura", lat: 35.337, lon: 139.5468 },
          { name: "Yokohama", lat: 35.466, lon: 139.622 },
          { name: "Tokyo", lat: 35.6812, lon: 139.7671 },
        ],
      },
      {
        id: "keikyu-bus-hokokuji",
        name: "Bus สาย 23/24 (ออกตะวันออก)",
        kind: "bus",
        color: "#b8860b",
        to: "Hokokuji (วัดป่าไผ่)",
        note: "วัดป่าไผ่อยู่ไกลเดิน ~30 นาที ขึ้นบัสหน้าสถานีลงป้าย Jomyoji แล้วเดิน 3 นาที",
        stops: [
          { name: "Kamakura Station", lat: 35.3192, lon: 139.5503 },
          { name: "Jomyoji (Hokokuji)", lat: 35.3205, lon: 139.573 },
        ],
      },
    ],
  },
  kanazawa: {
    station: {
      name: "Kanazawa Station",
      nameJa: "金沢駅",
      lat: 36.578,
      lon: 136.6486,
    },
    description:
      "จุดเที่ยวหลักของ Kanazawa ไม่มีรถไฟในเมืองเชื่อม — ทุกอย่างพึ่ง Loop Bus จากหน้าสถานี และจากที่นี่ยังมีบัสด่วนตรงไป Shirakawa-go",
    lines: [
      {
        id: "kanazawa-loop",
        name: "Kanazawa Loop Bus",
        kind: "bus",
        color: "#c0392b",
        to: "Higashi Chaya • Kenrokuen • 21st Century Museum (สายวน)",
        note: "วนขวา/วนซ้ายครอบทุกจุดหลัก ตั๋ววัน ¥800 คุ้มตั้งแต่เที่ยวที่สาม",
        stops: [
          { name: "Kanazawa Station", lat: 36.578, lon: 136.6486 },
          { name: "Omicho Market", lat: 36.5718, lon: 136.6565 },
          { name: "Hashibacho (Higashi Chaya)", lat: 36.5727, lon: 136.6669 },
          { name: "Kenrokuen", lat: 36.5613, lon: 136.6624 },
          { name: "21st Century Museum", lat: 36.5608, lon: 136.6585 },
          { name: "Korinbo", lat: 36.561, lon: 136.6517 },
          { name: "Kanazawa Station", lat: 36.578, lon: 136.6486 },
        ],
      },
      {
        id: "shirakawago-bus",
        name: "Hokutetsu Express Bus",
        kind: "bus",
        color: "#6c3483",
        to: "Shirakawa-go (~80 นาที)",
        note: "บัสด่วนตรงไปหมู่บ้านมรดกโลก ที่นั่งบังคับจอง — เต็มเร็วมากช่วงหิมะ",
        stops: [
          { name: "Kanazawa Station", lat: 36.578, lon: 136.6486 },
          { name: "Shirakawa-go", lat: 36.2571, lon: 136.9064 },
        ],
      },
    ],
  },
  nara: {
    station: {
      name: "JR Nara Station",
      nameJa: "奈良駅",
      lat: 34.6816,
      lon: 135.82,
    },
    description:
      "โซนกวาง-วัดใหญ่อยู่ฝั่งตะวันออกของเมือง เดินไกลพอสมควร — บัสวนช่วยได้มาก และมีรถไฟแยกไปวัด Horyuji กับเมืองรอบข้าง",
    lines: [
      {
        id: "nara-loop-bus",
        name: "City Loop Bus (สาย 2)",
        kind: "bus",
        color: "#c0392b",
        to: "Todaiji • Kasuga Taisha (สายวน)",
        note: "วนผ่านหน้า Nara Park ทุกจุด ลงป้าย Todaiji Daibutsuden เดินเข้าวัด 5 นาที",
        stops: [
          { name: "JR Nara Station", lat: 34.6816, lon: 135.82 },
          { name: "Kintetsu Nara", lat: 34.684, lon: 135.8281 },
          { name: "Todaiji Daibutsuden", lat: 34.6851, lon: 135.8398 },
          { name: "Kasuga Taisha", lat: 34.6814, lon: 135.8483 },
          { name: "JR Nara Station", lat: 34.6816, lon: 135.82 },
        ],
      },
      {
        id: "yamatoji",
        name: "JR Yamatoji Line (Rapid)",
        kind: "jr",
        color: "#27ae60",
        to: "Horyuji • Osaka (~50 นาที)",
        note: "ลง Horyuji ไปวัดไม้เก่าแก่ที่สุดในโลก (มรดกโลกชิ้นแรกของญี่ปุ่น) แล้วต่อยาวเข้า Osaka ได้เลย",
        stops: [
          { name: "JR Nara", lat: 34.6816, lon: 135.82 },
          { name: "Horyuji", lat: 34.599, lon: 135.7416 },
          { name: "Tennoji", lat: 34.647, lon: 135.5136 },
        ],
      },
      {
        id: "kintetsu-kyoto",
        name: "Kintetsu Line",
        kind: "jr",
        color: "#e5171f",
        to: "Kyoto (~45 นาที)",
        boardAt: "Kintetsu Nara (ใกล้สวนกวางกว่า JR)",
        note: "สถานี Kintetsu อยู่ติดโซนเที่ยว — ขากลับเข้า Kyoto ขึ้นจากที่นี่สะดวกกว่า JR",
        stops: [
          { name: "Kintetsu Nara", lat: 34.684, lon: 135.8281 },
          { name: "Yamato-Saidaiji", lat: 34.6925, lon: 135.786 },
          { name: "Kyoto", lat: 34.9858, lon: 135.7585 },
        ],
      },
    ],
  },
  kobe: {
    station: {
      name: "Sannomiya Station",
      nameJa: "三宮駅",
      lat: 34.6946,
      lon: 135.198,
    },
    description:
      "ฮับจริงของ Kobe คือ Sannomiya — บัสวนเก็บย่านเที่ยวทั้งหมด, รถไฟอัตโนมัติไปสนามบิน และ JR เร็วพิเศษไปปราสาท Himeji",
    lines: [
      {
        id: "city-loop",
        name: "Kobe City Loop Bus",
        kind: "bus",
        color: "#27ae60",
        to: "Kitano • Chinatown • Harborland (สายวน)",
        note: "บัสเรโทรวนครบทั้งบ้านฝรั่ง Kitano, ไชนาทาวน์ และท่าเรือ — ตั๋ววัน ¥700",
        stops: [
          { name: "Sannomiya", lat: 34.6946, lon: 135.198 },
          { name: "Kitano Ijinkan", lat: 34.7008, lon: 135.1899 },
          { name: "Nankinmachi (Chinatown)", lat: 34.6886, lon: 135.188 },
          { name: "Harborland", lat: 34.6797, lon: 135.1786 },
          { name: "Meriken Park", lat: 34.6826, lon: 135.1875 },
          { name: "Sannomiya", lat: 34.6946, lon: 135.198 },
        ],
      },
      {
        id: "port-liner",
        name: "Port Liner",
        kind: "jr",
        color: "#2980b9",
        to: "Kobe Airport (~18 นาที)",
        note: "รถไฟไร้คนขับวิ่งข้ามอ่าวไปสนามบิน Kobe นั่งหัวขบวนได้วิวเหมือนขับเอง",
        stops: [
          { name: "Sannomiya", lat: 34.6946, lon: 135.198 },
          { name: "Kobe Airport", lat: 34.6328, lon: 135.2226 },
        ],
      },
      {
        id: "seishin-yamate",
        name: "Subway Seishin-Yamate Line",
        kind: "subway",
        color: "#e67e22",
        to: "Shin-Kobe (Shinkansen • Nunobiki)",
        note: "1 สถานีถึง Shin-Kobe ต่อกระเช้าขึ้นสวนสมุนไพร Nunobiki หรือเดินไปน้ำตก",
        stops: [
          { name: "Sannomiya", lat: 34.6946, lon: 135.198 },
          { name: "Shin-Kobe", lat: 34.7066, lon: 135.1955 },
        ],
      },
      {
        id: "jr-kobe-line",
        name: "JR Kobe Line (Special Rapid)",
        kind: "jr",
        color: "#2c3e50",
        to: "Himeji Castle (~40 นาที)",
        note: "รถเร็วพิเศษไปปราสาทนกกระสาขาว มรดกโลกที่ควรเผื่อเวลาครึ่งวัน",
        stops: [
          { name: "Sannomiya", lat: 34.6946, lon: 135.198 },
          { name: "Akashi", lat: 34.6492, lon: 134.9924 },
          { name: "Himeji", lat: 34.8295, lon: 134.6932 },
        ],
      },
    ],
  },
  sendai: {
    station: {
      name: "Sendai Station",
      nameJa: "仙台駅",
      lat: 38.2602,
      lon: 140.8821,
    },
    description:
      "ในเมืองใช้บัสวน Loople เก็บมรดกตระกูล Date ส่วนรอบนอกมีสองเส้นเด่น: อ่าวสน Matsushima และวัดบนผา Yamadera",
    lines: [
      {
        id: "loople",
        name: "Loople Sendai",
        kind: "bus",
        color: "#8d6e63",
        to: "Zuihoden • ซากปราสาท Sendai (สายวน)",
        note: "บัสเรโทรวนจุดประวัติศาสตร์ ตั๋ววัน ¥630 ลงไหว้สุสาน Date Masamune แล้วขึ้นเนินปราสาท",
        stops: [
          { name: "Sendai Station", lat: 38.2602, lon: 140.8821 },
          { name: "Zuihoden", lat: 38.2491, lon: 140.877 },
          { name: "Sendai Castle Site", lat: 38.2525, lon: 140.856 },
          { name: "Osaki Hachimangu", lat: 38.2742, lon: 140.847 },
          { name: "Sendai Station", lat: 38.2602, lon: 140.8821 },
        ],
      },
      {
        id: "senseki",
        name: "JR Senseki Line",
        kind: "jr",
        color: "#2980b9",
        to: "Matsushima (~40 นาที)",
        note: "ไปอ่าวเกาะสน 1 ใน 3 วิวดังของญี่ปุ่น ลง Matsushima-Kaigan ติดท่าเรือชมอ่าว",
        stops: [
          { name: "Sendai", lat: 38.2602, lon: 140.8821 },
          { name: "Hon-Shiogama", lat: 38.3163, lon: 141.022 },
          { name: "Matsushima-Kaigan", lat: 38.368, lon: 141.059 },
        ],
      },
      {
        id: "senzan",
        name: "JR Senzan Line",
        kind: "jr",
        color: "#27ae60",
        to: "Yamadera (~50 นาที)",
        note: "วัด Risshakuji บนหน้าผา 1,015 ขั้น — day trip ที่คุ้มเหงื่อสุดของภูมิภาคนี้",
        stops: [
          { name: "Sendai", lat: 38.2602, lon: 140.8821 },
          { name: "Yamadera", lat: 38.3119, lon: 140.435 },
        ],
      },
    ],
  },
};

export function getCityTransit(slug: string): CityTransit | null {
  return transitByCity[slug] ?? null;
}
