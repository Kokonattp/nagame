import { slugifyCity } from "@/lib/utils/format";

export type JapanCitySeed = {
  name: string;
  japaneseName?: string;
  prefecture: string;
  lat: number;
  lon: number;
  slug: string;
};

const seeds = [
  ["Fukuoka", "福岡", "Fukuoka", 33.5902, 130.4017],
  ["Tokyo", "東京", "Tokyo", 35.6764, 139.65],
  ["Osaka", "大阪", "Osaka", 34.6937, 135.5023],
  ["Kyoto", "京都", "Kyoto", 35.0116, 135.7681],
  ["Sapporo", "札幌", "Hokkaido", 43.0618, 141.3545],
  ["Nagoya", "名古屋", "Aichi", 35.1815, 136.9066],
  ["Yokohama", "横浜", "Kanagawa", 35.4437, 139.638],
  ["Nara", "奈良", "Nara", 34.6851, 135.8048],
  ["Kobe", "神戸", "Hyogo", 34.6901, 135.1955],
  ["Hiroshima", "広島", "Hiroshima", 34.3853, 132.4553],
  ["Kanazawa", "金沢", "Ishikawa", 36.5613, 136.6562],
  ["Takayama", "高山", "Gifu", 36.1461, 137.2522],
  ["Kawaguchiko", "河口湖", "Yamanashi", 35.5171, 138.7518],
  ["Hakone", "箱根", "Kanagawa", 35.2324, 139.1069],
  ["Naha", "那覇", "Okinawa", 26.2124, 127.6792],
  ["Kamakura", "鎌倉", "Kanagawa", 35.3192, 139.5467],
  ["Nikko", "日光", "Tochigi", 36.7198, 139.6982],
  ["Matsumoto", "松本", "Nagano", 36.238, 137.972],
  ["Nagano", "長野", "Nagano", 36.6486, 138.1948],
  ["Sendai", "仙台", "Miyagi", 38.2682, 140.8694],
  ["Kagoshima", "鹿児島", "Kagoshima", 31.5966, 130.5571],
  ["Beppu", "別府", "Oita", 33.2846, 131.4912],
  ["Kumamoto", "熊本", "Kumamoto", 32.8031, 130.7079],
  ["Miyajima", "宮島", "Hiroshima", 34.2959, 132.3199],
  ["Ishigaki", "石垣", "Okinawa", 24.3407, 124.1556],
  ["Matsuyama", "松山", "Ehime", 33.8392, 132.7657],
  ["Okayama", "岡山", "Okayama", 34.6551, 133.9195],
  ["Kurashiki", "倉敷", "Okayama", 34.585, 133.7719],
  ["Takamatsu", "高松", "Kagawa", 34.3428, 134.0466],
  ["Aomori", "青森", "Aomori", 40.8222, 140.7474],
  ["Hakodate", "函館", "Hokkaido", 41.7687, 140.7291],
  ["Otaru", "小樽", "Hokkaido", 43.1907, 140.9947],
  ["Asahikawa", "旭川", "Hokkaido", 43.7706, 142.365],
  ["Shizuoka", "静岡", "Shizuoka", 34.9756, 138.3828],
  ["Atami", "熱海", "Shizuoka", 35.0955, 139.0717],
  ["Izu", "伊豆", "Shizuoka", 34.9766, 138.9468],
  ["Himeji", "姫路", "Hyogo", 34.8151, 134.6854],
  ["Wakayama", "和歌山", "Wakayama", 34.2304, 135.1708],
  ["Koyasan", "高野山", "Wakayama", 34.2123, 135.5848],
  ["Karuizawa", "軽井沢", "Nagano", 36.3484, 138.596],
  ["Yufuin", "由布院", "Oita", 33.2669, 131.3545],
] as const;

export const japanMajorCities: JapanCitySeed[] = seeds.map(
  ([name, japaneseName, prefecture, lat, lon]) => ({
    name,
    japaneseName,
    prefecture,
    lat,
    lon,
    slug: slugifyCity(name),
  }),
);

export function findJapanCitySeed(value: string) {
  const normalized = slugifyCity(value);
  return japanMajorCities.find(
    (city) =>
      city.slug === normalized ||
      slugifyCity(city.japaneseName ?? "") === normalized ||
      slugifyCity(`${city.name} ${city.prefecture}`) === normalized,
  );
}
