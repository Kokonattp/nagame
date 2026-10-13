// "ร้านราเมนแถวชินจูกุ" / "ซื้อของฝากที่ไหนดีในโอซาก้า" / "เรียวกังที่ฮาโกเนะ" — guide listings, never invented.
// Data: data/places/eat-buy.json (scripts/build-eat-buy.mjs, Wikivoyage Eat/Buy/Sleep, CC BY-SA).
// Cities the guide has no restaurants for are filled from data/places/eat-google.json: Google Maps
// results read on the owner's PC (workers/eat-places), shown with their rating and the date checked.
// Every listing links to Google Maps, where opening hours and reviews are current. Server only.

import eatBuyData from "@/data/places/eat-buy.json";
import eatGoogle from "@/data/places/eat-google.json";
import { CITY_BY_NAME, km } from "./cities";
import type { PlaceCard } from "./types";
import { stationFor } from "./transport";

type Listing = {
  n: string; a?: string; k: "eat" | "buy" | "sleep"; d?: string; la?: number; lo?: number; p?: 1 | 2 | 3; t: string[];
  /** from the Google Maps snapshot: rating, review count, place link */
  g?: { r: number; rc: number; url: string };
};
// guide headings written as listings ("Various Eateries") are not places
const DATA = Object.fromEntries(Object.entries(eatBuyData as unknown as Record<string, Listing[]>).map(([c, ls]) => [c, ls.filter((l) => !/^(various|other|many|several)\b/i.test(l.n))]));

// Google's category ("Seafood restaurant", "Unagi restaurant") → the same tags the guide listings use
const G_TAGS: [RegExp, string][] = [
  [/ramen|tsukemen/i, "ramen"], [/sushi|sashimi/i, "sushi"], [/udon|soba|noodle/i, "udon_soba"],
  [/yakiniku|steak|wagyu|beef|barbecue|bbq/i, "yakiniku"], [/tempura|tonkatsu|katsu/i, "tempura_tonkatsu"],
  [/okonomiyaki|takoyaki|kushikatsu/i, "okonomiyaki"], [/izakaya|yakitori|\bbar\b|pub/i, "izakaya"],
  [/seafood|fish|crab|unagi|eel|oyster|fugu/i, "seafood"], [/caf[eé]|coffee|dessert|bakery|sweets|acai|ice cream/i, "cafe_sweets"],
  [/kaiseki|vegetarian|vegan|shojin/i, "kaiseki"], [/curry/i, "curry"],
];
const G_SNAP = eatGoogle as { checkedAt: string; cities: Record<string, { n: string; r: number; rc: number; la: number; lo: number; cat: string; url: string }[]> };
// restaurants change slowly, but a year-old list is no longer "checked"
const G_FRESH = Date.now() - new Date(G_SNAP.checkedAt).getTime() < 365 * 86_400_000;
if (G_FRESH) {
  for (const [city, rows] of Object.entries(G_SNAP.cities)) {
    const c = CITY_BY_NAME.get(city);
    if (!c || DATA[city]?.some((l) => l.k === "eat")) continue; // the guide's own picks win
    // a search for a small town can return a place in the next city: keep what is really there
    const near = rows.filter((r) => km({ lat: r.la, lon: r.lo }, c) <= 10);
    DATA[city] = [...(DATA[city] ?? []), ...near.map((r): Listing => ({
      n: r.n, k: "eat", la: r.la, lo: r.lo, t: G_TAGS.filter(([re]) => re.test(r.cat)).map(([, t]) => t), g: { r: r.r, rc: r.rc, url: r.url },
    }))];
  }
}
const thDate = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });

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
const IS_BUY = /ของฝาก|ซื้อ|ช้อป|ช็อป|ชอป|ตลาด|ห้าง|เอาท์เล็ท|outlet|ดองกิ|ไฟฟ้า|อนิเมะ|ฟิกเกอร์|souvenir|shopping/i;
const PRICE = ["", "ราคาประหยัด", "ราคากลาง ๆ", "ราคาสูง"];

/** a question about where to stay (not about booking it — that stays with the booking reply) */
export const STAY_WORDS = /ที่พัก|พักที่ไหน|พักแถว|พักย่าน|นอนที่ไหน|โรงแรม|เรียวกัง|โฮสเทล|แคปซูล|เกสต์เฮาส์|hotel|ryokan|hostel|accommodation/i;
const SLEEP_TH: [RegExp, string, string][] = [
  [/เรียวกัง|ออนเซ็น|บ่อน้ำร้อน|ryokan/i, "ryokan", "เรียวกัง"], [/โฮสเทล|แคปซูล|เกสต์เฮาส์|hostel|capsule/i, "hostel", "โฮสเทล/เกสต์เฮาส์"],
  [/บิสิเนส|business/i, "business", "บิสิเนสโฮเทล"],
];
const SLEEP_PRICE: [RegExp, 1 | 3, string][] = [[/ถูก|ประหยัด|งบน้อย|cheap|budget/i, 1, "ราคาประหยัด"], [/หรู|แพง|luxury/i, 3, "ระดับหรู"]];
const SLEEP_PRICE_LABEL = ["", "ราคาประหยัด", "ราคากลาง ๆ", "ราคาสูง"];
// net/manga cafés are listed under Sleep in the guide, but are not what someone asking for a place to stay means
const NOT_A_STAY = /internet|media|comic|manga|caf[eé]/i;

/**
 * The district named in the message, unless it is part of another city's name: "คิโนะซากิออนเซ็น"
 * contains "กิออน" (Gion), so a district only counts when no other base city was named.
 */
function districtIn(message: string, focus: string[]) {
  const d = DISTRICTS.find(([re]) => re.test(message));
  const named = focus.filter((f) => CITY_BY_NAME.has(f));
  return d && (!named.length || named.includes(d[1])) ? d : undefined;
}

/** Tabelog keyword search (link only: Tabelog's terms forbid reusing its listings or scores). */
export const tabelog = (q: string) => `https://tabelog.com/en/rstLst/?sw=${encodeURIComponent(q)}`;

const maps = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const mapsLink = (l: Listing, area: string) => l.g?.url ?? (l.la && l.lo ? maps(`${l.n} ${l.la},${l.lo}`) : maps(`${l.n} ${area} Japan`));

export type EatBuyAnswer = { bubbles: string[]; links: { label: string; url: string }[]; places?: PlaceCard[] };

const TAG_TH = Object.fromEntries([...EAT_TH, ...BUY_TH, ...SLEEP_TH].map(([, key, th]) => [key, th]));
/** Google's category ("Unagi restaurant") → a Thai dish tag ("อาหารทะเล"), or "" */
export const cuisineTh = (cat: string) => TAG_TH[G_TAGS.find(([re]) => re.test(cat))?.[1] ?? ""] ?? "";
const card = (l: Listing, area: string): PlaceCard => ({
  kind: l.k, name: `${l.n}${l.a ? ` ${l.a}` : ""}`, url: mapsLink(l, area),
  rating: l.g?.r, reviews: l.g?.rc, tag: TAG_TH[l.t.find((t) => TAG_TH[t]) ?? ""], area: l.d,
  price: l.p ? (l.k === "sleep" ? SLEEP_PRICE_LABEL : PRICE)[l.p] : undefined,
});

/** The place and dish in a restaurant question, as the live-search worker takes them. */
export function eatQuery(message: string, focus: string[]) {
  if (IS_BUY.test(message)) return undefined; // shopping questions stay with the guide
  const district = districtIn(message, focus);
  const city = district?.[1] ?? focus.find((f) => CITY_BY_NAME.has(f));
  if (!city) return undefined;
  const tag = EAT_TH.find(([re]) => re.test(message));
  return {
    area: district ? `${district[2]} ${city}` : city,
    what: tag ? tag[1].replace(/_/g, " ") : "restaurant",
    whatTh: tag?.[2] ?? "ร้านอาหาร",
    placeTh: district ? district[2] : CITY_BY_NAME.get(city)?.th ?? city,
  };
}

/** Live look-up results as cards, same shape as the snapshot ones. */
export function livePlaceCards(places: { n: string; r: number; rc: number; url: string; cat: string }[]): PlaceCard[] {
  return places.slice(0, 6).map((p) => ({ kind: "eat", name: p.n, url: p.url, rating: p.r, reviews: p.rc, tag: cuisineTh(p.cat) || undefined }));
}

export function findEatBuy(message: string, focus: string[]): EatBuyAnswer {
  const kind = IS_BUY.test(message) ? "buy" : "eat";
  const district = districtIn(message, focus);
  // a city the guide covers first; else any named base city still gets a Google Maps search
  const city = district?.[1] ?? focus.find((f) => DATA[f]?.some((l) => l.k !== "sleep")) ?? focus.find((f) => CITY_BY_NAME.has(f));
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
  // cities filled from the Google snapshot say so, and that the list is ranked by rating
  const fromGoogle = all.some((l) => l.g);
  let pickFrom = tagged;
  if (!tagged.length && tag && district && all.some((l) => l.t.includes(tag[1]))) {
    pickFrom = all.filter((l) => l.t.includes(tag[1]));
    lead.push(`แถว ${district[2]} ไกด์ยังไม่มี${what}แนะนำ แต่ใน${cityTh}มีที่น่าลองตามนี้`);
  } else if (!tagged.length && tag) {
    pickFrom = inArea;
    lead.push(fromGoogle
      ? `${what}แถว${/^[A-Za-z]/.test(place) ? " " : ""}${place} ทาบิยังไม่มีรายชื่อ กดปุ่มค้นใน Google Maps ด้านล่างได้เลย ส่วนนี่คือร้านอื่นใน${place}ที่คะแนนดีใน Google Maps`
      : `${what}แถว${/^[A-Za-z]/.test(place) ? " " : ""}${place} ไกด์ยังไม่มีแนะนำเฉพาะ กดปุ่มค้นใน Google Maps ด้านล่างได้เลย ส่วนนี่คือ${kind === "eat" ? "ร้าน" : "ที่ซื้อของ"}อื่นที่ไกด์แนะนำใน${place}`);
  } else if (tagged.length) {
    lead.push(`${what}แถว${/^[A-Za-z]/.test(place) ? " " : ""}${place} ${fromGoogle ? "ที่คะแนนดีใน Google Maps" : "ที่ไกด์ Wikivoyage แนะนำ"} ${Math.min(tagged.length, 5)} ที่ กดดูรีวิวกับเวลาเปิดได้เลย`);
  }

  const picks = [...pickFrom].sort((a, b) => Number(Boolean(b.la)) - Number(Boolean(a.la))).slice(0, 5);
  const searchWord = tag ? (tag[1] === "souvenir" ? "souvenir shop" : tag[1].replace(/_/g, " ")) : kind === "eat" ? "restaurant" : "shopping";
  const area = district ? `${district[2]} ${city}` : city;
  const places = picks.map((l) => ({ ...card(l, area), area: district ? undefined : l.d }));
  const links: { label: string; url: string }[] = [];
  const search = { label: `ค้น ${searchWord} แถว ${area} ใน Google Maps (มีรีวิว)`, url: maps(`${searchWord} ${area} Japan`) };
  // restaurants: Japan's own review site too (scores from Japanese diners)
  const tabelogLink = kind === "eat" ? [{ label: `ดูคะแนนร้าน${tag ? tag[2] : ""}แถว ${area} ใน Tabelog`, url: tabelog(`${area} ${tag ? searchWord : ""}`.trim()) }] : [];
  // nothing of that kind right where they asked: the live search is the most useful answer, so it goes first
  if (tag && !tagged.length) links.unshift(search, ...tabelogLink);
  else links.push(search, ...tabelogLink);

  if (!picks.length) {
    return { bubbles: [`${what}แถว${/^[A-Za-z]/.test(place) ? " " : ""}${place} ทาบิยังไม่มีข้อมูลจากไกด์ กดค้นใน Google Maps ได้เลย ดูรีวิวกับเวลาเปิดประกอบได้`], links, places };
  }
  const credit = fromGoogle ? `คะแนนจาก Google Maps ทาบิเช็กเมื่อ ${thDate(G_SNAP.checkedAt)}` : "ข้อมูล: Wikivoyage";
  return { bubbles: [...lead, `ร้านอาจปิดหรือย้ายได้ เช็กเวลาเปิดใน Google Maps ก่อนไปนะ · ${credit}`], links, places };
}

// dinner in a day plan: places a traveller sits down for in the evening, from the guide
const DINNER_KINDS = ["izakaya", "seafood", "yakiniku", "ramen", "sushi", "okonomiyaki", "kaiseki", "udon_soba", "tempura_tonkatsu", "curry"];

/** A guide restaurant for night `night` in `city` (rotates), or undefined when the guide lists none. */
export function dinnerPick(city: string, night: number): { name: string; alt?: string; lat?: number; lon?: number } | undefined {
  // a sit-down dinner: not a café, bakery or supermarket ("Max Valu" is listed under Eat on Miyako)
  const eat = (DATA[city] ?? []).filter((l) => l.k === "eat" && !l.t.includes("cafe_sweets") && !/caf[eé]|coffee|bakery|sweets|^max ?valu|supermarket|convenience|7-eleven|lawson|familymart/i.test(l.n));
  const meal = eat.filter((l) => l.t.some((t) => DINNER_KINDS.includes(t)));
  const pool = (meal.length ? meal : eat).sort((a, b) => Number(Boolean(b.la)) - Number(Boolean(a.la)));
  const l = pool[night % Math.max(pool.length, 1)];
  return l ? { name: l.n, alt: l.a, lat: l.la, lon: l.lo } : undefined;
}

export type NearbyPin = { kind: "stay" | "eat"; name: string; city: string; lat: number; lon: number; url: string };

/** Map pins for the route's cities: up to `per` stays and restaurants each, only listings with coordinates. */
export function nearbyPins(cities: string[], per = 6): NearbyPin[] {
  const pins: NearbyPin[] = [];
  for (const city of cities) {
    for (const kind of ["stay", "eat"] as const) {
      const ls = (DATA[city] ?? []).filter((l) => l.k === (kind === "stay" ? "sleep" : "eat") && l.la && l.lo && !(kind === "stay" && NOT_A_STAY.test(l.n)));
      for (const l of ls.slice(0, per)) pins.push({ kind, name: `${l.n}${l.a ? ` ${l.a}` : ""}${l.g ? ` ⭐${l.g.r.toFixed(1)}` : ""}`, city, lat: l.la!, lon: l.lo!, url: mapsLink(l, city) });
    }
  }
  return pins;
}

const hotels = (q: string) => `https://www.google.com/travel/hotels?q=${encodeURIComponent(q)}`;

/** "แนะนำที่พักเกียวโต" / "เรียวกังที่ฮาโกเนะ" / "ที่พักถูก ๆ แถวชินจูกุ" */
export function findStay(message: string, focus: string[]): EatBuyAnswer {
  const district = districtIn(message, focus);
  const city = district?.[1] ?? focus.find((f) => CITY_BY_NAME.has(f));
  const tag = SLEEP_TH.find(([re]) => re.test(message));
  const band = SLEEP_PRICE.find(([re]) => re.test(message));
  const what = `${tag?.[2] ?? "ที่พัก"}${band ? band[2] : ""}`;

  if (!city) {
    return { bubbles: [`อยากหาที่พักที่เมืองไหน หรือย่านไหน? เช่น "ที่พักแถวชินจูกุ" หรือ "เรียวกังที่ฮาโกเนะ"`], links: [] };
  }
  const cityTh = CITY_BY_NAME.get(city)?.th ?? city;
  const place = district ? `${district[2]} (${cityTh})` : cityTh;
  const area = district ? `${district[2]} ${city}` : city;
  const searchWord = tag?.[1] === "ryokan" ? "ryokan" : tag?.[1] === "hostel" ? "hostels" : "hotels";
  const search = { label: `ดูราคาและห้องว่าง${tag ? ` ${tag[2]}` : ""}แถว${/^[A-Za-z]/.test(place) ? " " : ""}${place} ใน Google Hotels`, url: hotels(`${searchWord} in ${area}`) };

  const all = (DATA[city] ?? []).filter((l) => l.k === "sleep" && !NOT_A_STAY.test(l.n));
  // a hostel with no yen figure in the guide still counts as a budget stay
  const fits = (l: Listing) => (!tag || l.t.includes(tag[1])) && (!band || l.p === band[1] || (band[1] === 1 && !l.p && l.t.includes("hostel")));
  const inArea = district ? all.filter((l) => l.d === district[2] && fits(l)) : [];
  const pool = inArea.length ? inArea : all.filter(fits);
  const widened = Boolean(district && !inArea.length && pool.length);
  // mixed price bands when none was asked for (the guide lists hostels first), placed ones first
  const ranked = [...pool].sort((a, b) => Number(Boolean(b.la)) - Number(Boolean(a.la)) || Number(Boolean(b.p)) - Number(Boolean(a.p)));
  const byBand = [3, 2, 1, undefined].map((p) => ranked.filter((l) => l.p === p));
  const mixed: Listing[] = [];
  while (!band && mixed.length < ranked.length) for (const group of byBand) { const next = group.shift(); if (next) mixed.push(next); }
  const picks = (band ? ranked : mixed).slice(0, 5);
  const station = stationFor(city);
  // where the next leg leaves from: a station, a bus terminal or a port (an airport or an onsen
  // village is not a "stay near it" tip). A district answer is already "where", so no tip.
  const leaves = / Station$/.test(station) ? "นั่งรถไฟ" : /Bus (?:Terminal|Center|Stop)$/.test(station) ? "นั่งรถบัส" : / Port(?: Terminal)?$/.test(station) ? "นั่งเรือ" : null;
  const tip = district || !leaves ? [] : [`ถ้าจะ${leaves}ต่อไปที่อื่น พักใกล้ ${station} จะลากกระเป๋าน้อยสุด`];
  const at = (word: string, where: string) => `${word}${/^[A-Za-z]/.test(where) ? " " : ""}${where}`;

  if (!picks.length) {
    return {
      bubbles: [`${at(`${what}ที่`, place)} ไกด์ยังไม่มีรายชื่อแนะนำ กดดูที่พักกับราคาวันที่พี่ไปใน Google Hotels ได้เลย`, ...tip],
      links: [search, ...(tip.length ? [{ label: `ที่พักใกล้ ${station} ใน Google Maps`, url: maps(`hotels near ${station}`) }] : [])],
    };
  }
  const places = picks.map((l) => ({ ...card(l, area), area: district && !widened ? undefined : l.d }));
  const links = [search];
  return {
    bubbles: [
      widened
        ? `${at(`${what}แถว`, district![2])} ไกด์ยังไม่มีแนะนำ แต่ใน${cityTh}มีที่ไกด์ Wikivoyage แนะนำตามนี้`
        : `${at(`${what}แถว`, place)} ที่ไกด์ Wikivoyage แนะนำ ${picks.length} ที่`,
      ...tip,
      "ทาบิจองให้ไม่ได้ ราคากับห้องว่างของวันที่พี่ไปดูใน Google Hotels ได้เลย · ข้อมูล: Wikivoyage",
    ],
    links,
    places,
  };
}
