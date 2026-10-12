// Base cities Tabi plans around: the app's existing city seeds + Thai names,
// region and the airport a Thai traveller would fly into.

import { japanMajorCities } from "@/lib/cities/japan-major-cities";

export type Region =
  | "hokkaido" | "tohoku" | "kanto" | "chubu" | "kansai" | "chugoku" | "shikoku" | "kyushu" | "okinawa";

const TH: Record<string, string> = {
  Fukuoka: "ฟุกุโอกะ", Tokyo: "โตเกียว", Osaka: "โอซาก้า", Kyoto: "เกียวโต", Sapporo: "ซัปโปโร",
  Nagoya: "นาโกย่า", Yokohama: "โยโกฮาม่า", Nara: "นารา", Kobe: "โกเบ", Hiroshima: "ฮิโรชิม่า",
  Kanazawa: "คานาซาว่า", Takayama: "ทาคายาม่า", Kawaguchiko: "คาวากุจิโกะ", Hakone: "ฮาโกเนะ",
  Naha: "นาฮะ", Kamakura: "คามาคุระ", Nikko: "นิกโก้", Matsumoto: "มัตสึโมโตะ", Nagano: "นากาโนะ",
  Sendai: "เซ็นได", Kagoshima: "คาโกชิม่า", Beppu: "เบปปุ", Kumamoto: "คุมาโมโตะ", Miyajima: "มิยาจิม่า",
  Ishigaki: "อิชิงากิ", Matsuyama: "มัตสึยาม่า", Okayama: "โอคายาม่า", Kurashiki: "คุราชิกิ",
  Takamatsu: "ทาคามัตสึ", Aomori: "อาโอโมริ", Hakodate: "ฮาโกดาเตะ", Otaru: "โอตารุ",
  Asahikawa: "อาซาฮิกาว่า", Shizuoka: "ชิซึโอกะ", Atami: "อาตามิ", Izu: "อิซุ", Himeji: "ฮิเมจิ",
  Wakayama: "วากายาม่า", Koyasan: "โคยะซัง", Karuizawa: "คารุอิซาว่า", Yufuin: "ยูฟุอิน",
};

// all 47 prefectures (keep in sync with REGION in scripts/build-places.mjs)
const PREFECTURE_REGION: Record<string, Region> = {
  Hokkaido: "hokkaido",
  Aomori: "tohoku", Iwate: "tohoku", Miyagi: "tohoku", Akita: "tohoku", Yamagata: "tohoku", Fukushima: "tohoku",
  Ibaraki: "kanto", Tochigi: "kanto", Gunma: "kanto", Saitama: "kanto", Chiba: "kanto", Tokyo: "kanto", Kanagawa: "kanto",
  Niigata: "chubu", Toyama: "chubu", Ishikawa: "chubu", Fukui: "chubu", Yamanashi: "chubu", Nagano: "chubu", Gifu: "chubu", Shizuoka: "chubu", Aichi: "chubu",
  Mie: "kansai", Shiga: "kansai", Kyoto: "kansai", Osaka: "kansai", Hyogo: "kansai", Nara: "kansai", Wakayama: "kansai",
  Tottori: "chugoku", Shimane: "chugoku", Okayama: "chugoku", Hiroshima: "chugoku", Yamaguchi: "chugoku",
  Tokushima: "shikoku", Kagawa: "shikoku", Ehime: "shikoku", Kochi: "shikoku",
  Fukuoka: "kyushu", Saga: "kyushu", Nagasaki: "kyushu", Kumamoto: "kyushu", Oita: "kyushu", Miyazaki: "kyushu", Kagoshima: "kyushu",
  Okinawa: "okinawa",
};

/** Airports with direct-flight demand from Bangkok, keyed by the hub city. */
export const GATEWAYS: { city: string; airport: string; searchName: string }[] = [
  { city: "Tokyo", airport: "TYO", searchName: "Tokyo" },
  { city: "Osaka", airport: "OSA", searchName: "Osaka" },
  { city: "Nagoya", airport: "NGO", searchName: "Nagoya" },
  { city: "Fukuoka", airport: "FUK", searchName: "Fukuoka" },
  { city: "Sapporo", airport: "CTS", searchName: "Sapporo" },
  { city: "Naha", airport: "OKA", searchName: "Okinawa" },
];

export type BaseCity = { name: string; th: string; lat: number; lon: number; region: Region };

/**
 * Extra bases Tabi needs that the /city pages don't have (kept here so the older
 * city list, sitemap and /city/[slug] routes stay unchanged). Keep in sync with
 * EXTRA_BASES in scripts/build-places.mjs.
 */
export const TABI_EXTRA_BASES: readonly { name: string; th: string; lat: number; lon: number; prefecture: string; wv?: string }[] = [
  { name: "Toyama", th: "โทยามะ", lat: 36.6953, lon: 137.2113, prefecture: "Toyama" }, // Tateyama Alpine Route gateway (mockup 3)
  // 2026-10-12: prefecture capitals and well-known smaller destinations, each with a Wikivoyage
  // article (wv = its title when different). Points: the article's {{geo}}, or hand-checked where
  // the guide pointed at a park centre. Cities closer than 18 km to another base were left out
  // (their places stay with the nearer base, e.g. Uji → Kyoto).
  { name: "Furano", th: "ฟุราโนะ", lat: 43.35, lon: 142.3833, prefecture: "Hokkaido" },
  { name: "Biei", th: "บิเอ", lat: 43.5647, lon: 142.506, prefecture: "Hokkaido" },
  { name: "Noboribetsu", th: "โนโบริเบ็ตสึ", lat: 42.4128, lon: 141.1067, prefecture: "Hokkaido" },
  { name: "Niseko", th: "นิเซโกะ", lat: 42.8047, lon: 140.6875, prefecture: "Hokkaido" },
  { name: "Kushiro", th: "คุชิโระ", lat: 42.9833, lon: 144.3833, prefecture: "Hokkaido" },
  { name: "Abashiri", th: "อาบาชิริ", lat: 44.0204, lon: 144.2733, prefecture: "Hokkaido" },
  { name: "Shiretoko", th: "ชิเรโตโกะ", lat: 44.0692, lon: 144.9917, prefecture: "Hokkaido", wv: "Shiretoko National Park" },
  { name: "Obihiro", th: "โอบิฮิโระ", lat: 42.87, lon: 143.2, prefecture: "Hokkaido" },
  { name: "Toya", th: "ทะเลสาบโทยะ", lat: 42.5659, lon: 140.8204, prefecture: "Hokkaido", wv: "Shikotsu-Toya National Park" },
  { name: "Sounkyo", th: "โซอุนเคียว", lat: 43.7284, lon: 142.95, prefecture: "Hokkaido", wv: "Sounkyo Onsen" },
  { name: "Wakkanai", th: "วักกาไน", lat: 45.44, lon: 141.82, prefecture: "Hokkaido" },
  { name: "Morioka", th: "โมริโอกะ", lat: 39.6833, lon: 141.15, prefecture: "Iwate" },
  { name: "Hiraizumi", th: "ฮิราอิซูมิ", lat: 38.9836, lon: 141.1172, prefecture: "Iwate" },
  { name: "Akita", th: "อากิตะ", lat: 39.7171, lon: 140.1058, prefecture: "Akita" },
  { name: "Kakunodate", th: "คาคุโนดาเตะ", lat: 39.59, lon: 140.57, prefecture: "Akita", wv: "Semboku/Kakunodate" },
  { name: "Hirosaki", th: "ฮิโรซากิ", lat: 40.6, lon: 140.4667, prefecture: "Aomori" },
  { name: "Towada", th: "ทะเลสาบโทวาดะ", lat: 40.4637, lon: 140.8737, prefecture: "Aomori", wv: "Towada-Hachimantai National Park" },
  { name: "Yamagata", th: "ยามากาตะ", lat: 38.25, lon: 140.3333, prefecture: "Yamagata" },
  { name: "Ginzan Onsen", th: "กินซังออนเซ็น", lat: 38.5703, lon: 140.5306, prefecture: "Yamagata", wv: "Obanazawa" },
  { name: "Tsuruoka", th: "สึรุโอกะ", lat: 38.7167, lon: 139.8167, prefecture: "Yamagata" },
  { name: "Matsushima", th: "มัตสึชิมะ", lat: 38.3667, lon: 141.0833, prefecture: "Miyagi" },
  { name: "Aizuwakamatsu", th: "ไอสึวากามัตสึ", lat: 37.49, lon: 139.934, prefecture: "Fukushima" },
  { name: "Fukushima", th: "ฟุกุชิมะ", lat: 37.7608, lon: 140.4747, prefecture: "Fukushima", wv: "Fukushima (city)" },
  { name: "Kawagoe", th: "คาวาโกเอะ", lat: 35.9333, lon: 139.4833, prefecture: "Saitama" },
  { name: "Chichibu", th: "ชิจิบุ", lat: 36, lon: 139.0833, prefecture: "Saitama" },
  { name: "Kusatsu", th: "คุซัตสึ", lat: 36.6167, lon: 138.6, prefecture: "Gunma" },
  { name: "Minakami", th: "มินากามิ", lat: 36.6789, lon: 138.9992, prefecture: "Gunma" },
  { name: "Mito", th: "มิโตะ", lat: 36.3667, lon: 140.4667, prefecture: "Ibaraki" },
  { name: "Narita", th: "นาริตะ", lat: 35.7833, lon: 140.3167, prefecture: "Chiba" },
  { name: "Utsunomiya", th: "อุตสึโนมิยะ", lat: 36.55, lon: 139.8833, prefecture: "Tochigi" },
  { name: "Niigata", th: "นีงาตะ", lat: 37.916, lon: 139.036, prefecture: "Niigata" },
  { name: "Sado", th: "เกาะซาโดะ", lat: 38.0167, lon: 138.3667, prefecture: "Niigata", wv: "Sado Island" },
  { name: "Kofu", th: "โคฟุ", lat: 35.6667, lon: 138.5667, prefecture: "Yamanashi" },
  { name: "Gifu", th: "กิฟุ", lat: 35.4167, lon: 136.7667, prefecture: "Gifu" },
  { name: "Gujo Hachiman", th: "กุโจฮาจิมัง", lat: 35.7486, lon: 136.9644, prefecture: "Gifu", wv: "Gujo" },
  { name: "Shirakawa-go", th: "ชิราคาวาโกะ", lat: 36.2667, lon: 136.9, prefecture: "Gifu" },
  { name: "Gero", th: "เกะโระออนเซ็น", lat: 35.8065, lon: 137.244, prefecture: "Gifu" },
  { name: "Fukui", th: "ฟุกุอิ", lat: 36.0667, lon: 136.2167, prefecture: "Fukui" },
  { name: "Hamamatsu", th: "ฮามามัตสึ", lat: 34.73, lon: 137.712, prefecture: "Shizuoka" },
  { name: "Shimoda", th: "ชิโมดะ", lat: 34.6833, lon: 138.95, prefecture: "Shizuoka" },
  { name: "Tsumago", th: "ทสึมาโกะ", lat: 35.5753, lon: 137.5951, prefecture: "Nagano" },
  { name: "Hakuba", th: "ฮาคุบะ", lat: 36.7, lon: 137.8667, prefecture: "Nagano" },
  { name: "Nozawa Onsen", th: "โนซาวะออนเซ็น", lat: 36.9226, lon: 138.4466, prefecture: "Nagano" },
  { name: "Kurobe", th: "คุโรเบะ", lat: 36.8155, lon: 137.5822, prefecture: "Toyama" },
  { name: "Wajima", th: "วาจิมะ", lat: 37.3833, lon: 136.9, prefecture: "Ishikawa" },
  { name: "Gotemba", th: "โกเท็มบะ", lat: 35.3167, lon: 138.9333, prefecture: "Shizuoka" },
  { name: "Ise", th: "อิเสะ", lat: 34.4833, lon: 136.7167, prefecture: "Mie" },
  { name: "Hikone", th: "ฮิโกเนะ", lat: 35.2667, lon: 136.2667, prefecture: "Shiga" },
  { name: "Amanohashidate", th: "อามาโนะฮาชิดาเตะ", lat: 35.5696, lon: 135.192, prefecture: "Kyoto" },
  { name: "Kinosaki", th: "คิโนะซากิออนเซ็น", lat: 35.6274, lon: 134.8155, prefecture: "Hyogo" },
  { name: "Shirahama", th: "ชิราฮามะ", lat: 33.6781, lon: 135.3481, prefecture: "Wakayama" },
  { name: "Nachikatsuura", th: "นาจิคัตสึอุระ", lat: 33.6417, lon: 135.9344, prefecture: "Wakayama" },
  { name: "Hongu", th: "คุมาโนะฮงงู", lat: 33.8291, lon: 135.7763, prefecture: "Wakayama" },
  { name: "Asuka", th: "อาสึกะ", lat: 34.4667, lon: 135.8167, prefecture: "Nara" },
  { name: "Tottori", th: "ทตโตริ", lat: 35.5, lon: 134.2333, prefecture: "Tottori" },
  { name: "Matsue", th: "มัตสึเอะ", lat: 35.4667, lon: 133.05, prefecture: "Shimane" },
  { name: "Izumo", th: "อิซุโมะ", lat: 35.3667, lon: 132.7667, prefecture: "Shimane" },
  { name: "Tsuwano", th: "สึวาโนะ", lat: 34.4667, lon: 131.7667, prefecture: "Shimane" },
  { name: "Hagi", th: "ฮางิ", lat: 34.3989, lon: 131.4078, prefecture: "Yamaguchi" },
  { name: "Shimonoseki", th: "ชิโมโนเซกิ", lat: 33.95, lon: 130.9333, prefecture: "Yamaguchi" },
  { name: "Yamaguchi", th: "ยามางุจิ", lat: 34.1783, lon: 131.4739, prefecture: "Yamaguchi" },
  { name: "Iwakuni", th: "อิวาคุนิ", lat: 34.15, lon: 132.1833, prefecture: "Yamaguchi" },
  { name: "Onomichi", th: "โอโนมิจิ", lat: 34.4167, lon: 133.2, prefecture: "Hiroshima" },
  { name: "Kure", th: "คุเระ", lat: 34.25, lon: 132.5667, prefecture: "Hiroshima" },
  { name: "Yonago", th: "โยนาโกะ", lat: 35.4333, lon: 133.3333, prefecture: "Tottori" },
  { name: "Tokushima", th: "โทกุชิมะ", lat: 34.0667, lon: 134.55, prefecture: "Tokushima" },
  { name: "Kochi", th: "โคจิ", lat: 33.5597, lon: 133.5311, prefecture: "Kochi", wv: "Kochi (Kochi)" },
  { name: "Kotohira", th: "โคโตฮิระ", lat: 34.2019, lon: 133.8267, prefecture: "Kagawa" },
  { name: "Iya Valley", th: "หุบเขาอิยะ", lat: 33.906, lon: 133.813, prefecture: "Tokushima", wv: "Miyoshi (Tokushima)/Iya Valley" },
  { name: "Uchiko", th: "อุจิโกะ", lat: 33.55, lon: 132.65, prefecture: "Ehime" },
  { name: "Nagasaki", th: "นางาซากิ", lat: 32.7833, lon: 129.8667, prefecture: "Nagasaki" },
  { name: "Sasebo", th: "ซาเซโบะ", lat: 33.1833, lon: 129.7167, prefecture: "Nagasaki" },
  { name: "Unzen", th: "อุนเซ็น", lat: 32.7436, lon: 130.2614, prefecture: "Nagasaki" },
  { name: "Saga", th: "ซากะ", lat: 33.2667, lon: 130.3, prefecture: "Saga" },
  { name: "Karatsu", th: "คาราสึ", lat: 33.45, lon: 129.9667, prefecture: "Saga" },
  { name: "Ureshino", th: "อุเรชิโนะ", lat: 33.1333, lon: 130.0667, prefecture: "Saga" },
  { name: "Aso", th: "อาโสะ", lat: 32.8844, lon: 131.1039, prefecture: "Kumamoto", wv: "Mount Aso" },
  { name: "Kurokawa Onsen", th: "คุโรคาวะออนเซ็น", lat: 33.0789, lon: 131.1428, prefecture: "Kumamoto", wv: "Kurokawa" },
  { name: "Takachiho", th: "ทาคาชิโฮะ", lat: 32.7167, lon: 131.3, prefecture: "Miyazaki" },
  { name: "Miyazaki", th: "มิยาซากิ", lat: 31.9167, lon: 131.4167, prefecture: "Miyazaki" },
  { name: "Ibusuki", th: "อิบุสึกิ", lat: 31.2528, lon: 130.6331, prefecture: "Kagoshima" },
  { name: "Yakushima", th: "เกาะยาคุชิมะ", lat: 30.3586, lon: 130.5286, prefecture: "Kagoshima" },
  { name: "Nago", th: "นาโกะ", lat: 26.5916, lon: 127.9774, prefecture: "Okinawa", wv: "Northern Okinawa" },
  { name: "Miyakojima", th: "เกาะมิยาโกะ", lat: 24.7667, lon: 125.3167, prefecture: "Okinawa", wv: "Miyako (Okinawa)" },
  { name: "Zamami", th: "เกาะซามามิ", lat: 26.2289, lon: 127.3033, prefecture: "Okinawa" },
  { name: "Iriomote", th: "เกาะอิริโอโมเตะ", lat: 24.334, lon: 123.7994, prefecture: "Okinawa" },
];

export const BASE_CITIES: BaseCity[] = [
  ...japanMajorCities.map((c) => ({
    name: c.name,
    th: TH[c.name] ?? c.name,
    lat: c.lat,
    lon: c.lon,
    region: PREFECTURE_REGION[c.prefecture] ?? "kanto",
  })),
  ...TABI_EXTRA_BASES.map((c) => ({ name: c.name, th: c.th, lat: c.lat, lon: c.lon, region: PREFECTURE_REGION[c.prefecture] ?? "chubu" })),
];

export const CITY_BY_NAME = new Map(BASE_CITIES.map((c) => [c.name, c]));

export const REGION_TH: Record<Region, string> = {
  hokkaido: "ฮอกไกโด", tohoku: "โทโฮคุ", kanto: "คันโต", chubu: "ชูบุ", kansai: "คันไซ",
  chugoku: "ชูโงกุ", shikoku: "ชิโกกุ", kyushu: "คิวชู", okinawa: "โอกินาว่า",
};

/** Thai/English words → base city or region. Longer aliases first so "โอซาก้า" wins over "โอ". */
const EXTRA_ALIASES: [string, string][] = [
  ["โอซาก้", "Osaka"], ["ฟูจิ", "Kawaguchiko"], ["ภูเขาไฟฟูจิ", "Kawaguchiko"],
  ["ทาเตยามะ", "Toyama"], ["ทาเตะยามะ", "Toyama"], ["tateyama", "Toyama"], ["คามิโคจิ", "Matsumoto"], ["ชิราคาวะโกะ", "Shirakawa-go"], ["shirakawago", "Shirakawa-go"],
  ["ทตโตะริ", "Tottori"], ["ทตโทริ", "Tottori"], ["คิโนซากิ", "Kinosaki"], ["นางาซากิ", "Nagasaki"], ["นากาซากิ", "Nagasaki"], ["คุซัตสึ", "Kusatsu"],
  ["อุจิ", "Kyoto"], ["ดาไซฟุ", "Fukuoka"], ["นาโอชิมะ", "Takamatsu"], ["อาริมะ", "Kobe"], ["ซาโอ", "Yamagata"], ["คินุงาวะ", "Nikko"], ["อินุยามะ", "Gifu"], ["เกาะโอกินาว่า", "Naha"],
  ["hokkaido", "region:hokkaido"], ["kyushu", "region:kyushu"], ["okinawa", "region:okinawa"], ["โอกินาวา", "region:okinawa"],
];
const ALIASES: [string, string][] = [
  ...BASE_CITIES.flatMap((c): [string, string][] => [[c.th, c.name], [c.name.toLowerCase(), c.name]]),
  // short forms people actually type: "คิโนะซากิ" for คิโนะซากิออนเซ็น, "ยาคุชิมะ" for เกาะยาคุชิมะ
  ...BASE_CITIES.flatMap((c): [string, string][] => {
    const short = c.th.replace(/ออนเซ็น$|^เกาะ|^ทะเลสาบ|^หุบเขา/, "");
    return short !== c.th && short.length >= 3 ? [[short, c.name]] : [];
  }),
  ...EXTRA_ALIASES,
  ...Object.entries(REGION_TH).map(([id, th]): [string, string] => [th, `region:${id}`]),
].sort((a, b) => b[0].length - a[0].length);

// Thai spellings drift on tone marks and the final vowel ("คานาซาว่า" / "คานาซาวะ" / "คานาซาวา"):
// compare without tone marks and with short "ะ" read as "า"
const loose = (s: string) => s.toLowerCase().replace(/[็-์]/g, "").replace(/ะ/g, "า");

export function findFocus(message: string): string[] {
  let text = loose(message);
  const found = new Set<string>();
  for (const [raw, target] of ALIASES) {
    if (raw.length < 3) continue;
    const alias = loose(raw);
    // Latin names must match a whole word: "nago" is not "nagoya", "ise" is not "paradise"
    const hit = /^[a-z0-9 .-]+$/.test(alias)
      ? new RegExp(`(^|[^a-z])${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z])`).test(text)
      : text.includes(alias);
    if (!hit) continue;
    found.add(target);
    // a name inside a longer one already matched is not a second place ("ซากะ" in "โอซาก้า")
    if (!/^[a-z0-9 .-]+$/.test(alias)) text = text.split(alias).join(" ");
  }
  return [...found];
}

export function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function nearestGateway(city: { lat: number; lon: number }) {
  return GATEWAYS.map((g) => ({ g, d: km(city, CITY_BY_NAME.get(g.city)!) })).sort((a, b) => a.d - b.d)[0];
}
