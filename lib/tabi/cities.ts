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

const PREFECTURE_REGION: Record<string, Region> = {
  Hokkaido: "hokkaido", Aomori: "tohoku", Miyagi: "tohoku",
  Tokyo: "kanto", Kanagawa: "kanto", Tochigi: "kanto",
  Yamanashi: "chubu", Nagano: "chubu", Aichi: "chubu", Ishikawa: "chubu", Gifu: "chubu", Shizuoka: "chubu",
  Osaka: "kansai", Kyoto: "kansai", Nara: "kansai", Hyogo: "kansai", Wakayama: "kansai",
  Hiroshima: "chugoku", Okayama: "chugoku", Kagawa: "shikoku", Ehime: "shikoku",
  Fukuoka: "kyushu", Kagoshima: "kyushu", Oita: "kyushu", Kumamoto: "kyushu", Okinawa: "okinawa",
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

export const BASE_CITIES: BaseCity[] = japanMajorCities.map((c) => ({
  name: c.name,
  th: TH[c.name] ?? c.name,
  lat: c.lat,
  lon: c.lon,
  region: PREFECTURE_REGION[c.prefecture] ?? "kanto",
}));

export const CITY_BY_NAME = new Map(BASE_CITIES.map((c) => [c.name, c]));

export const REGION_TH: Record<Region, string> = {
  hokkaido: "ฮอกไกโด", tohoku: "โทโฮคุ", kanto: "คันโต", chubu: "ชูบุ", kansai: "คันไซ",
  chugoku: "ชูโงกุ", shikoku: "ชิโกกุ", kyushu: "คิวชู", okinawa: "โอกินาว่า",
};

/** Thai/English words → base city or region. Longer aliases first so "โอซาก้า" wins over "โอ". */
const EXTRA_ALIASES: [string, string][] = [
  ["โอซาก้", "Osaka"], ["ฟูจิ", "Kawaguchiko"], ["ภูเขาไฟฟูจิ", "Kawaguchiko"],
  ["ทาเตยามะ", "region:chubu"], ["ทาเตะยามะ", "region:chubu"], ["คามิโคจิ", "Matsumoto"], ["ชิราคาวาโกะ", "Takayama"],
  ["hokkaido", "region:hokkaido"], ["kyushu", "region:kyushu"], ["okinawa", "region:okinawa"], ["โอกินาวา", "region:okinawa"],
];
const ALIASES: [string, string][] = [
  ...BASE_CITIES.flatMap((c): [string, string][] => [[c.th, c.name], [c.name.toLowerCase(), c.name]]),
  ...EXTRA_ALIASES,
  ...Object.entries(REGION_TH).map(([id, th]): [string, string] => [th, `region:${id}`]),
].sort((a, b) => b[0].length - a[0].length);

export function findFocus(message: string): string[] {
  const text = message.toLowerCase();
  const found = new Set<string>();
  for (const [alias, target] of ALIASES) if (alias.length >= 3 && text.includes(alias)) found.add(target);
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
