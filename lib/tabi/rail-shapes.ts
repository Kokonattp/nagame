// The trip map's route line, drawn along the real track or road between stops (shapes from
// scripts/build-rail-shapes.mjs, OpenStreetMap). Legs follow the same chain of connections the
// day plan's travel times use, e.g. Kawaguchiko → Tokyo → Nikko. A connection without a shape
// (ferry, flight, or not traced) is drawn straight.

import shapesData from "@/data/transport/rail-shapes.json";
import { CITY_BY_NAME } from "./cities";
import { travelTime } from "./rail-times";

type Pt = [number, number];
const SHAPES = shapesData as unknown as Record<string, Pt[]>;

function hop(from: string, to: string): Pt[] | null {
  const fwd = SHAPES[`${from}|${to}`];
  if (fwd) return fwd;
  const back = SHAPES[`${to}|${from}`];
  if (back) return [...back].reverse();
  const a = CITY_BY_NAME.get(from), b = CITY_BY_NAME.get(to);
  return a && b ? [[a.lon, a.lat], [b.lon, b.lat]] : null;
}

/** [lon, lat] points for the stops in order; falls back to the stop points themselves. */
export function routeLine(stops: { city: string; lon: number; lat: number }[]): Pt[] {
  const out: Pt[] = stops.length ? [[stops[0].lon, stops[0].lat]] : [];
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1], b = stops[i];
    const path = travelTime(a.city, b.city)?.path ?? [a.city, b.city];
    const legs = path.some((p) => p.startsWith("airport:")) ? [[a.city, b.city]] : path.slice(1).map((p, k) => [path[k], p]);
    let drew = false;
    for (const [x, y] of legs) {
      const pts = hop(x, y);
      if (!pts) { drew = false; break; }
      out.push(...pts.slice(1));
      drew = true;
    }
    if (!drew) out.push([b.lon, b.lat]);
    else out[out.length - 1] = [b.lon, b.lat]; // end exactly on the marker
  }
  return out;
}
