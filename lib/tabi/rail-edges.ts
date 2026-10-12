// The hand-checked visitor connections between base cities (minutes, fastest usual way).
// Kept dependency-free so build scripts can import it with Node's type stripping
// (scripts/build-rail-times.mjs calibrates on these; scripts/build-rail-shapes.mjs draws them).
// Spot-checked against Google Maps transit on 2026-10-10; see lib/tabi/rail-times.ts.

export type HopMode = "train" | "bus" | "ferry" | "flight";
export type Edge = [from: string, to: string, minutes: number, mode?: HopMode];

export const RAIL_EDGES: readonly Edge[] = [
  // Kanto + Izu + Fuji
  ["Tokyo", "Yokohama", 30], ["Tokyo", "Kamakura", 60], ["Yokohama", "Kamakura", 30],
  ["Tokyo", "Hakone", 85], ["Kamakura", "Hakone", 90], ["Yokohama", "Hakone", 75], ["Tokyo", "Kawaguchiko", 115], ["Hakone", "Kawaguchiko", 150, "bus"],
  ["Tokyo", "Nikko", 115], ["Tokyo", "Atami", 45], ["Hakone", "Atami", 50, "bus"],
  ["Atami", "Izu", 60], ["Tokyo", "Shizuoka", 60], ["Atami", "Shizuoka", 35],
  ["Kawaguchiko", "Shizuoka", 135, "bus"],
  // Hokuriku shinkansen + Shinshu
  ["Tokyo", "Karuizawa", 65], ["Karuizawa", "Nagano", 30], ["Tokyo", "Nagano", 85],
  ["Nagano", "Toyama", 50], ["Toyama", "Kanazawa", 25], ["Tokyo", "Toyama", 130], ["Tokyo", "Kanazawa", 150],
  ["Tokyo", "Matsumoto", 160], ["Matsumoto", "Nagano", 50], ["Kawaguchiko", "Matsumoto", 190],
  ["Matsumoto", "Takayama", 150, "bus"], ["Takayama", "Kanazawa", 130, "bus"], ["Takayama", "Toyama", 90],
  // Tokaido / Kansai
  ["Tokyo", "Nagoya", 100], ["Shizuoka", "Nagoya", 60], ["Nagoya", "Takayama", 140],
  ["Nagoya", "Kyoto", 35], ["Tokyo", "Kyoto", 135], ["Tokyo", "Osaka", 150],
  ["Kyoto", "Osaka", 30], ["Kyoto", "Nara", 45], ["Osaka", "Nara", 40], ["Kyoto", "Kanazawa", 135],
  ["Osaka", "Kobe", 25], ["Kobe", "Himeji", 40], ["Osaka", "Himeji", 40],
  ["Osaka", "Wakayama", 60], ["Osaka", "Koyasan", 125], ["Wakayama", "Koyasan", 120],
  // Sanyo / Shikoku / Kyushu
  ["Osaka", "Okayama", 50], ["Himeji", "Okayama", 25], ["Okayama", "Kurashiki", 15],
  ["Okayama", "Hiroshima", 40], ["Hiroshima", "Miyajima", 45], ["Okayama", "Takamatsu", 55],
  ["Takamatsu", "Matsuyama", 150], ["Hiroshima", "Matsuyama", 160, "ferry"],
  ["Hiroshima", "Fukuoka", 65], ["Fukuoka", "Kumamoto", 35], ["Kumamoto", "Kagoshima", 45],
  ["Fukuoka", "Beppu", 125], ["Beppu", "Yufuin", 55, "bus"], ["Fukuoka", "Yufuin", 125],
  // Tohoku / Hokkaido
  ["Tokyo", "Sendai", 95], ["Sendai", "Aomori", 95], ["Tokyo", "Aomori", 190],
  ["Aomori", "Hakodate", 130], ["Hakodate", "Sapporo", 225], ["Sapporo", "Otaru", 35], ["Sapporo", "Asahikawa", 85],
  // Okinawa
  ["Naha", "Ishigaki", 150, "flight"],
  // airports → their city (gateway codes as used by the planner)
  ["airport:TYO", "Tokyo", 60], ["airport:OSA", "Osaka", 50], ["airport:OSA", "Kyoto", 80],
  ["airport:NGO", "Nagoya", 30], ["airport:FUK", "Fukuoka", 10], ["airport:CTS", "Sapporo", 40], ["airport:OKA", "Naha", 15],
];
