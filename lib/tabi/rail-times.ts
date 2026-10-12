// Typical fastest door-to-station travel times between neighbouring base cities (minutes),
// for the day plan's "ประมาณ N ชม." — straight-line distance guessed Kawaguchiko→Nikko as 1 h
// when it is ~4 h via Tokyo. Edges are the usual way a visitor goes (shinkansen / limited express
// / highway bus / ferry); trips between other cities follow the shortest chain of edges plus a
// transfer allowance per change. Spot-checked against Google Maps transit on 2026-10-10
// (10 pairs, departing 10:00; all within ~25 min after tuning). Still an estimate: the UI labels it ประมาณ and links Google Maps.

import generated from "@/data/transport/rail-times-generated.json";
import { RAIL_EDGES, type Edge, type HopMode } from "./rail-edges";

export type { HopMode } from "./rail-edges";

// Hand-checked connections (rail-edges.ts) + computed ones for the Tabi-only bases
// (scripts/build-rail-times.mjs: real track × line speed calibrated on the hand-checked set,
// road time for buses, timetables for islands). Every time is shown as "ประมาณ" with a Google Maps link.
const EDGES: readonly Edge[] = [...RAIL_EDGES, ...(generated as unknown as Edge[])];
const TRANSFER_MIN = 20;

const graph = new Map<string, { to: string; min: number; mode: HopMode }[]>();
for (const [a, b, min, mode = "train"] of EDGES) {
  for (const [x, y] of [[a, b], [b, a]]) {
    if (!graph.has(x)) graph.set(x, []);
    graph.get(x)!.push({ to: y, min, mode });
  }
}

/** `path` = the cities passed through, e.g. Kawaguchiko → Tokyo → Nikko (used for fares). */
export type TravelTime = { minutes: number; mode: HopMode; path: string[] };

/** Shortest travel time (Dijkstra) with a transfer allowance per change; null when no known connection. */
export function travelTime(from: string, to: string): TravelTime | null {
  if (from === to) return { minutes: 0, mode: "train", path: [from] };
  if (!graph.has(from) || !graph.has(to)) return null;
  const best = new Map<string, number>([[from, 0]]);
  const via = new Map<string, HopMode[]>([[from, []]]);
  const prev = new Map<string, string>();
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
        prev.set(e.to, at);
        if (!queue.includes(e.to)) queue.push(e.to);
      }
    }
  }
  const minutes = best.get(to);
  if (minutes === undefined) return null;
  const modes = via.get(to)!;
  // the leg's chip: a bus/ferry/flight hop matters more to the traveller than the train hops around it
  const mode = modes.find((m) => m !== "train") ?? "train";
  const path = [to];
  while (path[0] !== from) path.unshift(prev.get(path[0])!);
  return { minutes, mode, path };
}

/** "45 นาที", "1 ชม.", "3 ชม. 30 นาที" — rounded to 15 min (it is an estimate). */
export function durationTh(minutes: number) {
  const m = Math.max(15, Math.round(minutes / 15) * 15);
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return h === 0 ? `${rest} นาที` : rest ? `${h} ชม. ${rest} นาที` : `${h} ชม.`;
}
