import { cityConfigs, type Recommendation, type RecommendationKind } from "@/lib/cities/city-configs";

type CityMeta = {
  intro: string;
  mood: string;
  heroImage?: string;
};

type NearbyCity = {
  slug: string;
  name: string;
  prefecture: string;
  japaneseName: string;
  distanceKm: number;
  intro: string;
  mood: string;
  heroImage?: string;
};

const cityMetaBySlug: Record<string, CityMeta> = {
  fukuoka: {
    intro: "เมืองสายกินง่าย เดินง่าย และเหมาะกับทริปที่อยากบาลานซ์ระหว่าง local food, คาเฟ่, waterfront และ day trip รอบคิวชู",
    mood: "food city",
    heroImage: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Fukuoka_City_from_Fukuoka_Tower.jpg?width=1600",
  },
  tokyo: {
    intro: "เมืองใหญ่ที่เที่ยวได้ทุกสภาพอากาศ เพราะมีทั้งย่านเดินเมือง พิพิธภัณฑ์ ร้านอาหาร และการต่อรถที่ยืดหยุ่นมาก",
    mood: "big city pulse",
    heroImage: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Tokyo_Montage_2015.jpg?width=1600",
  },
  osaka: {
    intro: "เด่นเรื่องอาหาร บรรยากาศคึกคัก และเหมาะกับคนที่อยากเที่ยวแบบไม่ต้องวางแผนซับซ้อนมาก",
    mood: "street energy",
    heroImage: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Osaka_Montage_2015.png?width=1600",
  },
  kyoto: {
    intro: "เหมาะกับวันที่อยากเที่ยวช้าลง เน้นวัด สวน ย่านเดิน และจังหวะเมืองที่ละมุนกว่าเมืองใหญ่",
    mood: "heritage calm",
    heroImage: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Kyoto_Montage.jpg?width=1600",
  },
  sapporo: {
    intro: "เหมาะกับทริปกินจริงจังและอากาศเย็น เดินเมืองง่าย มีทั้งสวนกลางเมืองและย่านกลางคืนชัดเจน",
    mood: "cool climate",
    heroImage: "https://commons.wikimedia.org/wiki/Special:Redirect/file:Sapporo_City_Montage.jpg?width=1600",
  },
  naha: {
    intro: "เมืองพักผ่อนที่ผสมทะเล อาหารโอกินาวะ และการเดินเที่ยวแบบไม่เร่งรีบได้ดี",
    mood: "island pace",
    heroImage: "https://commons.wikimedia.org/wiki/Special:Redirect/file:Naha_City_Okinawa_Japan.jpg?width=1600",
  },
};

export function getCityMeta(slug: string, name: string) {
  return (
    cityMetaBySlug[slug] ?? {
      intro: `${name} เป็นเมืองที่เหมาะกับการใช้หน้าเดียวเช็กอากาศ เมืองใกล้เคียง จุดกิน จุดนอน และข่าวอีเวนต์ก่อนออกเที่ยว`,
      mood: "travel day",
    }
  );
}

export function getNearbyCities(slug: string, lat: number, lon: number, limit = 6): NearbyCity[] {
  return cityConfigs
    .filter((city) => city.slug !== slug)
    .map((city) => ({
      slug: city.slug,
      name: city.name,
      prefecture: city.prefecture,
      japaneseName: city.japaneseName,
      distanceKm: haversine(lat, lon, city.lat, city.lon),
      intro: getCityMeta(city.slug, city.name).intro,
      mood: getCityMeta(city.slug, city.name).mood,
      heroImage: getCityMeta(city.slug, city.name).heroImage,
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

export function getRecommendationSets(
  cityName: string,
  prefecture: string | undefined,
  recommendations: Recommendation[],
) {
  const enriched = cityName.toLowerCase() === "fukuoka" ? [...recommendations, ...fukuokaExpandedRecommendations()] : recommendations;
  const fallback = buildFallbackRecommendations(cityName, prefecture);

  return {
    see: mergeRecommendations(enriched, fallback, "see", 6),
    eat: mergeRecommendations(enriched, fallback, "eat", 8),
    sleep: mergeRecommendations(enriched, fallback, "sleep", 8),
  };
}

function mergeRecommendations(
  configured: Recommendation[],
  fallback: Recommendation[],
  kind: RecommendationKind,
  limit = 4,
) {
  const merged: Recommendation[] = [];
  const seen = new Set<string>();

  [...configured.filter((item) => item.kind === kind), ...fallback.filter((item) => item.kind === kind)].forEach((item) => {
    const key = `${item.kind}:${item.title.toLowerCase()}`;
    if (seen.has(key) || merged.length >= limit) return;
    seen.add(key);
    merged.push(item);
  });

  return merged;
}

function buildFallbackRecommendations(cityName: string, prefecture?: string): Recommendation[] {
  const cityArea = prefecture ? `${cityName}, ${prefecture}` : cityName;

  return [
    {
      kind: "see",
      title: `${cityName} Station area`,
      area: cityArea,
      signal: "เดินง่าย + ต่อรถสะดวก",
      note: "เหมาะเริ่มต้นวันเพื่อเช็กจังหวะเมือง ร้านกาแฟ จุดข้อมูล และวางแผนต่อไปยังย่านอื่น",
    },
    {
      kind: "see",
      title: `${cityName} central park`,
      area: cityArea,
      signal: "เหมาะวันฟ้าเปิด",
      note: "ใช้เป็นจุดเดินเบา ๆ ถ่ายภาพ และดูว่าลม ฝน และความหนาแน่นของคนจริงหน้าพื้นที่เป็นอย่างไร",
    },
    {
      kind: "see",
      title: `${cityName} museum or cultural area`,
      area: cityArea,
      signal: "สำรองวันฝนมา",
      note: "เป็นแผน indoor ที่ปลอดภัยกว่าเมื่อสภาพอากาศเปลี่ยนหรืออยากเที่ยวแบบไม่เร่งมาก",
    },
    {
      kind: "see",
      title: `${cityName} waterfront or night view`,
      area: cityArea,
      signal: "เหมาะช่วงเย็น",
      note: "ถ้าวันนี้อากาศนิ่งและฝนต่ำ ช่วงเย็นมักเป็นเวลาที่ได้บรรยากาศเมืองดีที่สุด",
    },
    {
      kind: "eat",
      title: `Local market in ${cityName}`,
      area: cityArea,
      signal: "กินหลายอย่างในจุดเดียว",
      note: "เหมาะเมื่ออยากชิมหลายเมนูโดยไม่ต้องจองหรือเดินไกล และปรับแผนได้ง่ายหน้างาน",
    },
    {
      kind: "eat",
      title: `${cityName} station ramen / noodle area`,
      area: cityArea,
      signal: "เร็วและใช้งานจริง",
      note: "ใช้ได้ดีหลังย้ายเมืองหรือวันที่ต้องคุมเวลา เพราะเดินถึงง่ายและมีตัวเลือกสำรองเยอะ",
    },
    {
      kind: "eat",
      title: `${cityName} cafe street`,
      area: cityArea,
      signal: "เหมาะพักกลางวัน",
      note: "เหมาะแทรกในแผนเมื่ออยากพักเท้า เช็ก route ต่อ หรือหลบฝนแบบไม่เสียจังหวะทริป",
    },
    {
      kind: "eat",
      title: `${cityName} local izakaya zone`,
      area: cityArea,
      signal: "เด่นช่วงค่ำ",
      note: "ดีสำหรับมื้อเย็นที่อยากได้บรรยากาศท้องถิ่นมากขึ้น แต่ควรเลือกย่านที่กลับโรงแรมง่าย",
    },
    {
      kind: "sleep",
      title: `${cityName} station hotel base`,
      area: cityArea,
      signal: "เหมาะทริปคล่องตัว",
      note: "เหมาะกับคนที่มีแพลนย้ายเมือง เช็กอินดึก หรือเน้นใช้รถไฟเป็นหลักตลอดทริป",
    },
    {
      kind: "sleep",
      title: `${cityName} downtown stay`,
      area: cityArea,
      signal: "กินเที่ยวจบในย่าน",
      note: "เหมาะถ้าอยากเดินต่อมื้อค่ำหรือ shopping โดยไม่ต้องพึ่งรถมากในช่วงดึก",
    },
    {
      kind: "sleep",
      title: `${cityName} quiet residential stay`,
      area: cityArea,
      signal: "พักสบายกว่า",
      note: "ดีสำหรับคนที่ให้ความสำคัญกับการนอนและไม่ต้องการความคึกคักตลอดคืน",
    },
    {
      kind: "sleep",
      title: `${cityName} ryokan or onsen stay`,
      area: cityArea,
      signal: "เหมาะคืนพิเศษ",
      note: "ใช้สำหรับคืนที่อยากได้ประสบการณ์พักจริงจังมากขึ้น โดยเฉพาะถ้าเมืองนั้นมี traditional stay เด่น",
    },
  ];
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadiusKm * c);
}

function fukuokaExpandedRecommendations(): Recommendation[] {
  return [
    { kind: "see", title: "Momochi Seaside Park", area: "Sawara", note: "เหมาะวันฟ้าเปิด และอยากได้บรรยากาศริมทะเล", signal: "sea view" },
    { kind: "see", title: "Kushida Shrine", area: "Hakata", note: "จุดประวัติศาสตร์ที่แทรกได้ง่ายในวันเดินเมือง", signal: "heritage stop" },
    { kind: "eat", title: "Hakata Ramen Shin-Shin Tenjin", area: "Tenjin", note: "ราเม็นขึ้นชื่อในย่านที่เดินต่อคาเฟ่และช็อปได้ง่าย", signal: "local favorite" },
    { kind: "eat", title: "Nagahama No.1 Gion Branch", area: "Gion", note: "กินง่ายก่อนหรือหลังเดินย่าน Hakata เพราะใกล้สถานี Gion", signal: "2 min from station" },
    { kind: "eat", title: "Ichiran Main Shop Nakasu", area: "Nakasu", note: "เหมาะกับมื้อดึกหรือหลังย้ายเมือง เพราะเดินต่อ nightlife ได้", signal: "late-night ramen" },
    { kind: "eat", title: "Motsunabe Ooyama Hakata", area: "Hakata", note: "มื้อเย็นแบบ local classic สำหรับคนที่อยากลอง motsunabe จริงจัง", signal: "local specialty" },
    { kind: "eat", title: "Ramen Stadium at Canal City", area: "Hakata", note: "เลือกได้หลายร้านในจุดเดียว เหมาะเมื่ออยากลองหลายแบบ", signal: "many choices" },
    { kind: "sleep", title: "Oriental Hotel Fukuoka Hakata Station", area: "Hakata", note: "ติดสถานี Hakata จริง เหมาะกับคนที่เน้นลากกระเป๋าและต่อรถง่าย", signal: "station-connected" },
    { kind: "sleep", title: "Hotel Forza Hakataeki Hakataguchi", area: "Hakata", note: "เดินจากทางออก Hakata ไม่นาน เหมาะกับทริปที่กลับดึกแต่ยังคุม route ง่าย", signal: "3 min walk" },
    { kind: "sleep", title: "THE BASICS FUKUOKA", area: "Hakata", note: "โรงแรมโทนดีไซน์ชัดกว่า เหมาะกับคนที่อยากพักสบายขึ้นแต่ยังคล่องตัว", signal: "design stay" },
    { kind: "sleep", title: "Yaoji Hakata Hotel", area: "Hakata", note: "เหมาะถ้าอยากได้ออนเซ็นแบบง่าย ๆ ในเมืองพร้อมกลับสถานีไม่ยาก", signal: "onsen option" },
    { kind: "sleep", title: "Henn na Hotel Fukuoka Hakata", area: "Nakasu / Hakata", note: "ใกล้ Nakasu-Kawabata เหมาะกับคนที่อยากตั้งฐานกลางระหว่าง Hakata และ Tenjin", signal: "walkable nightlife" },
    { kind: "sleep", title: "Cross Life Hakata Tenjin", area: "Haruyoshi / Tenjin", note: "ฐานพักสายเดินกินค่ำ ใกล้ Tenjin-Minami จึงไปต่อได้ง่าย", signal: "tenjin access" },
    { kind: "sleep", title: "ANA Crowne Plaza Fukuoka", area: "Hakata", note: "ตัวเลือกที่สงบและดูพรีเมียมขึ้น แต่ยังเดินถึง Hakata ได้ไม่ไกล", signal: "premium option" },
  ];
}
