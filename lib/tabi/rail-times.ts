// Typical fastest door-to-station travel times between neighbouring base cities (minutes),
// for the day plan's "ประมาณ N ชม." — straight-line distance guessed Kawaguchiko→Nikko as 1 h
// when it is ~4 h via Tokyo. Edges are the usual way a visitor goes (shinkansen / limited express
// / highway bus / ferry); trips between other cities follow the shortest chain of edges plus a
// transfer allowance per change. Spot-checked against Google Maps transit on 2026-10-10
// (10 pairs, departing 10:00; all within ~25 min after tuning). Still an estimate: the UI labels it ประมาณ and links Google Maps.

export type HopMode = "train" | "bus" | "ferry" | "flight";
type Edge = [from: string, to: string, minutes: number, mode?: HopMode];

const EDGES: Edge[] = [
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

const TRANSFER_MIN = 20;

const graph = new Map<string, { to: string; min: number; mode: HopMode }[]>();
for (const [a, b, min, mode = "train"] of EDGES) {
  for (const [x, y] of [[a, b], [b, a]]) {
    if (!graph.has(x)) graph.set(x, []);
    graph.get(x)!.push({ to: y, min, mode });
  }
}

export type TravelTime = { minutes: number; mode: HopMode };

/** Shortest travel time (Dijkstra) with a transfer allowance per change; null when no known connection. */
export function travelTime(from: string, to: string): TravelTime | null {
  if (from === to) return { minutes: 0, mode: "train" };
  if (!graph.has(from) || !graph.has(to)) return null;
  const best = new Map<string, number>([[from, 0]]);
  const via = new Map<string, HopMode[]>([[from, []]]);
  const queue = [from];
  while (queue.length) {
    queue.sort((a, b) => best.get(a)! - best.get(b)!);
    const at = queue.shift()!;
    if (at === to) break;
    for (const e of graph.get(at)!) {
      const cost = best.get(at)! + e.min + (at === from ? 0 : TRANSFER_MIN);
      if (cost < (best.get(e.to) ?? Infinity)) {
        best.set(e.to, cost);
        via.set(e.to, [...via.get(at)!, e.mode]);
        if (!queue.includes(e.to)) queue.push(e.to);
      }
    }
  }
  const minutes = best.get(to);
  if (minutes === undefined) return null;
  const modes = via.get(to)!;
  // the leg's chip: a bus/ferry/flight hop matters more to the traveller than the train hops around it
  const mode = modes.find((m) => m !== "train") ?? "train";
  return { minutes, mode };
}

/** "45 นาที", "1 ชม.", "3 ชม. 30 นาที" — rounded to 15 min (it is an estimate). */
export function durationTh(minutes: number) {
  const m = Math.max(15, Math.round(minutes / 15) * 15);
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return h === 0 ? `${rest} นาที` : rest ? `${h} ชม. ${rest} นาที` : `${h} ชม.`;
}
