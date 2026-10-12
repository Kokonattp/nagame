// "ร้านราเมนแถวชินจูกุ" / "ซื้อของฝากที่ไหนดีในโอซาก้า" — guide listings, never invented.
// Data: data/places/eat-buy.json (scripts/build-eat-buy.mjs, Wikivoyage Eat/Buy, CC BY-SA).
// Every listing links to Google Maps, where opening hours and reviews are current. Server only.

import eatBuyData from "@/data/places/eat-buy.json";
import { CITY_BY_NAME } from "./cities";

type Listing = { n: string; a?: string; k: "eat" | "buy"; d?: string; la?: number; lo?: number; p?: 1 | 2 | 3; t: string[] };
// guide headings written as listings ("Various Eateries") are not places
const DATA = Object.fromEntries(Object.entries(eatBuyData as unknown as Record<string, Listing[]>).map(([c, ls]) => [c, ls.filter((l) => !/^(various|other|many|several)\b/i.test(l.n))]));

/** Thai and English district names → the guide's district for that city */
const DISTRICTS: [RegExp, string, string][] = [
  [/ชินจูกุ|shinjuku/i, "Tokyo", "Shinjuku"], [/ชิบูย่า|ชิบุยะ|shibuya/i, "Tokyo", "Shibuya"], [/ฮาราจูกุ|โอโมเตะซันโด|harajuku|omotesando/i, "Tokyo", "Harajuku"],
  [/อาซากุสะ|asakusa/i, "Tokyo", "Asakusa"], [/อุเอโนะ|ueno/i, "Tokyo", "Ueno"], [/อากิฮาบาระ|akihabara/i, "Tokyo", "Akihabara"],
  [/กินซ่า|ginza/i, "Tokyo", "Ginza"], [/ร็?อปปงงิ|roppongi/i, "Tokyo", "Roppongi"], [/เอบิสุ|ebisu/i, "Tokyo", "Ebisu"],
  [/โอไดบะ|odaiba/i, "Tokyo", "Odaiba"], [/อิเคบุคุโระ|ikebukuro/i, "Tokyo", "Toshima"], [/คิจิโจจิ|kichijoji/i, "Tokyo", "Kichijoji"],
  [/ชินางาวะ|shinagawa/i, "Tokyo", "Shinagawa"], [/อาคาซากะ|akasaka/i, "Tokyo", "Akasaka"], [/ชิมบาชิ|ชินบาชิ|shinbashi|shimbashi/i, "Tokyo", "Shinbashi"],
  [/นากาโนะ|nakano/i, "Tokyo", "Nakano"], [/ชิโมคิตะ|เซตางายะ|shimokita|setagaya/i, "Tokyo", "Setagaya"], [/เมงุโระ|meguro/i, "Tokyo", "Meguro"],
  [/สึกิจิ|ทสึกิจิ|tsukiji/i, "Tokyo", "Chuo"], [/สกายทรี|สุมิดะ|ซูมิดะ|skytree|sumida/i, "Tokyo", "Sumida"],
  [/อุเมดะ|umeda/i, "Osaka", "Kita"], [/นัมบะ|นัมบา|โดทงโบริ|โดทนโบริ|ชินไซบาชิ|namba|dotonbori|shinsaibashi/i, "Osaka", "Minami"],
  [/เทนโนจิ|ชินเซไก|tennoji|shinsekai/i, "Osaka", "Tennoji"],
  [/กิออน|ฮิงาชิยามะ|gion|higashiyama/i, "Kyoto", "Higashiyama"], [/อาราชิยามะ|arashiyama/i, "Kyoto", "Arashiyama"],
  [/ฟุชิมิ|fushimi/i, "Kyoto", "South"], [/คาวาระมาจิ|ชิโจ|นิชิกิ|kawaramachi|shijo|nishiki/i, "Kyoto", "Central"],
];

const EAT_TH: [RegExp, string, string][] = [
  [/ราเม|ramen|สึเกะเมง/i, "ramen", "ราเมน"], [/ซูชิ|ซาชิมิ|sushi/i, "sushi", "ซูชิ"], [/อุด้ง|โซบะ|udon|soba/i, "udon_soba", "อุด้ง/โซบะ"],
  [/ยากินิกุ|ปิ้งย่าง|วากิว|เนื้อ|สเต็ก|yakiniku|wagyu/i, "yakiniku", "เนื้อ/ปิ้งย่าง"], [/เทมปุระ|ทงคัตสึ|หมูทอด|tempura|tonkatsu/i, "tempura_tonkatsu", "เทมปุระ/ทงคัตสึ"],
  [/โอโคโนมิ|ทาโกะยากิ|คุชิคัตสึ|okonomiyaki|takoyaki/i, "okonomiyaki", "โอโคโนมิยากิ/ทาโกะยากิ"], [/อิซากายะ|ยากิโทริ|บาร์|ดื่ม|izakaya|yakitori/i, "izakaya", "อิซากายะ"],
  [/ซีฟู้ด|อาหารทะเล|ปู|หอยนางรม|seafood|crab/i, "seafood", "อาหารทะเล"], [/คาเฟ่|กาแฟ|ของหวาน|ขนม|เค้ก|มัทฉะ|ไอติม|cafe|dessert/i, "cafe_sweets", "คาเฟ่/ของหวาน"],
  [/ไคเซกิ|มังสวิรัติ|เจ|เต้าหู้|kaiseki|vegetarian/i, "kaiseki", "ไคเซกิ/อาหารเจ"], [/กะหรี่|curry/i, "curry", "แกงกะหรี่"], [/ถูก|ประหยัด|งบน้อย|cheap/i, "cheap", "ราคาประหยัด"],
];
const BUY_TH: [RegExp, string, string][] = [
  [/ของฝาก|ของที่ระลึก|งานฝีมือ|souvenir/i, "souvenir", "ของฝาก"], [/ห้าง|เอาท์เล็ท|outlet|mall/i, "department", "ห้าง"],
  [/ตลาด|ถนนช้อป|market/i, "market", "ตลาด"], [/ไฟฟ้า|กล้อง|อนิเมะ|การ์ตูน|เกม|ฟิกเกอร์|anime|electronics/i, "electronics", "ไฟฟ้า/อนิเมะ"],
  [/ยา|เครื่องสำอาง|ดองกิ|ดอนกิ|drugstore|cosmetic/i, "drugstore", "ยา/เครื่องสำอาง"], [/ขนมฝาก|ชา|สาเก|sake/i, "food_gift", "ขนม/ชา/สาเก"],
];
const IS_BUY = /ของฝาก|ซื้อ|ช้อป|ตลาด|ห้าง|เอาท์เล็ท|outlet|ดองกิ|ไฟฟ้า|อนิเมะ|ฟิกเกอร์|souvenir|shopping/i;
const PRICE = ["", "ราคาประหยัด", "ราคากลาง ๆ", "ราคาสูง"];

const maps = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

export type EatBuyAnswer = { bubbles: string[]; links: { label: string; url: string }[] };

export function findEatBuy(message: string, focus: string[]): EatBuyAnswer {
  const kind = IS_BUY.test(message) ? "buy" : "eat";
  const district = DISTRICTS.find(([re]) => re.test(message));
  const city = district?.[1] ?? focus.find((f) => DATA[f]?.length);
  const tag = (kind === "eat" ? EAT_TH : BUY_TH).find(([re]) => re.test(message));
  const what = tag?.[2] ?? (kind === "eat" ? "ร้านอาหาร" : "ที่ช้อปปิ้ง");

  if (!city) {
    return { bubbles: [`อยากหา${what}ที่เมืองไหน หรือย่านไหน? เช่น "ราเมนแถวชินจูกุ" หรือ "ของฝากที่เกียวโต"`], links: [] };
  }
  const cityTh = CITY_BY_NAME.get(city)?.th ?? city;
  const place = district ? `${district[2]} (${cityTh})` : cityTh;
  const all = (DATA[city] ?? []).filter((l) => l.k === kind);
  const inArea = district ? all.filter((l) => l.d === district[2]) : all;
  const tagged = tag ? inArea.filter((l) => l.t.includes(tag[1])) : inArea;

  const lead: string[] = [];
  let pickFrom = tagged;
  if (!tagged.length && tag && district && all.some((l) => l.t.includes(tag[1]))) {
    pickFrom = all.filter((l) => l.t.includes(tag[1]));
    lead.push(`แถว ${district[2]} ไกด์ยังไม่มี${what}แนะนำ แต่ใน${cityTh}มีที่น่าลองตามนี้`);
  } else if (!tagged.length && tag) {
    pickFrom = inArea;
    lead.push(`${what}แถว${place} ไกด์ยังไม่มีแนะนำเฉพาะ กดค้นใน Google Maps ด้านบนได้เลย ส่วนนี่คือ${kind === "eat" ? "ร้าน" : "ที่ซื้อของ"}อื่นที่ไกด์แนะนำใน${place}`);
  } else if (tagged.length) {
    lead.push(`${what}แถว${place} ที่ไกด์ Wikivoyage แนะนำ ${Math.min(tagged.length, 5)} ที่ กดดูรีวิวกับเวลาเปิดได้เลย`);
  }

  const picks = [...pickFrom].sort((a, b) => Number(Boolean(b.la)) - Number(Boolean(a.la))).slice(0, 5);
  const searchWord = tag ? (tag[1] === "souvenir" ? "souvenir shop" : tag[1].replace(/_/g, " ")) : kind === "eat" ? "restaurant" : "shopping";
  const area = district ? `${district[2]} ${city}` : city;
  const links = picks.map((l) => ({
    label: `${l.n}${l.a ? ` ${l.a}` : ""}${l.d && !district ? ` · ${l.d}` : ""}${l.p ? ` · ${PRICE[l.p]}` : ""}`,
    url: l.la && l.lo ? maps(`${l.n} ${l.la},${l.lo}`) : maps(`${l.n} ${area} Japan`),
  }));
  const search = { label: `ค้น ${searchWord} แถว ${area} ใน Google Maps (มีรีวิว)`, url: maps(`${searchWord} ${area} Japan`) };
  // nothing of that kind right where they asked: the live search is the most useful answer, so it goes first
  if (tag && !tagged.length) links.unshift(search);
  else links.push(search);

  if (!picks.length) {
    return { bubbles: [`${what}แถว${place} ทาบิยังไม่มีข้อมูลจากไกด์ กดค้นใน Google Maps ได้เลย ดูรีวิวกับเวลาเปิดประกอบได้`], links };
  }
  return { bubbles: [...lead, "ร้านอาจปิดหรือย้ายได้ เช็กเวลาเปิดใน Google Maps ก่อนไปนะ · ข้อมูล: Wikivoyage"], links };
}
