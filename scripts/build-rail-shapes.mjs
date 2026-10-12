// Draws every visitor connection in lib/tabi/rail-times.ts along the real line instead of a
// straight stroke, and writes data/transport/rail-shapes.json ({ "Tokyo|Kyoto": [[lon, lat], …] }).
//
//   node scripts/build-rail-shapes.mjs            (only edges missing from the file)
//   node scripts/build-rail-shapes.mjs --all      (rebuild everything)
//
// Rail: 国土数値情報 鉄道データ N02-23 (MLIT, CC BY 4.0 — credited on the map), shortest path
// along the track between the rail points nearest each city. Tries Shinkansen first, then JR,
// then any ordinary railway. Download once (17 MB) and unzip the UTF-8 RailroadSection.geojson:
//   https://nlftp.mlit.go.jp/ksj/gml/data/N02/N02-23/N02-23_GML.zip
//   default path D:/TT/nagame-workers/cache/n02/UTF-8/N02-23_RailroadSection.geojson (or N02_GEOJSON=…)
// Bus: the road route from the public OSRM server. Ferry and flight stay straight (over the sea).
// A connection that cannot be traced is left out and the map draws it straight.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { RAIL_EDGES as CHECKED } from "../lib/tabi/rail-edges.ts";
// hand-checked + computed connections (scripts/build-rail-times.mjs)
const GENERATED_FILE = new URL("../data/transport/rail-times-generated.json", import.meta.url);
const RAIL_EDGES = [...CHECKED, ...(existsSync(GENERATED_FILE) ? JSON.parse(readFileSync(GENERATED_FILE, "utf8")) : [])];

const OUT = new URL("../data/transport/rail-shapes.json", import.meta.url);
const ALL = process.argv.includes("--all");
const OSRM = "https://router.project-osrm.org/route/v1/driving";
const UA = "nagame-tabi/1.0 (rail shapes build; https://nagame.vercel.app)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// city coordinates = the same points the map draws its stop markers at
const COORD = new Map();
const major = readFileSync(new URL("../lib/cities/japan-major-cities.ts", import.meta.url), "utf8");
for (const m of major.matchAll(/\["([^"]+)",\s*"[^"]*",\s*"[^"]*",\s*([\d.]+),\s*([\d.]+)/g)) COORD.set(m[1], [Number(m[3]), Number(m[2])]);
const extra = readFileSync(new URL("../lib/tabi/cities.ts", import.meta.url), "utf8");
for (const m of extra.matchAll(/name:\s*"([^"]+)",\s*th:\s*"[^"]*",\s*lat:\s*([\d.]+),\s*lon:\s*([\d.]+)/g)) COORD.set(m[1], [Number(m[3]), Number(m[2])]);

const rad = Math.PI / 180;
function km([lon1, lat1], [lon2, lat2]) {
  const h = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// Douglas–Peucker in degrees (~0.004° ≈ 400 m: invisible at the zooms the trip map uses)
function simplify(pts, tol = 0.004) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let worst = 0, at = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1e-12;
    const d = Math.abs(dy * x - dx * y + b[0] * a[1] - b[1] * a[0]) / len;
    if (d > worst) { worst = d; at = i; }
  }
  if (worst <= tol) return [a, b];
  return [...simplify(pts.slice(0, at + 1), tol).slice(0, -1), ...simplify(pts.slice(at), tol)];
}
const round = (pts) => pts.map(([x, y]) => [Math.round(x * 1e4) / 1e4, Math.round(y * 1e4) / 1e4]);

const N02 = process.env.N02_GEOJSON ?? "D:/TT/nagame-workers/cache/n02/UTF-8/N02-23_RailroadSection.geojson";
const sections = JSON.parse(readFileSync(N02, "utf8")).features.filter((f) => ["11", "12"].includes(f.properties.N02_001)); // ordinary railways (no cable cars / monorails)
// N02_002: 1 Shinkansen · 2 JR conventional · 3 public · 4 private · 5 third-sector
const TIERS = [
  { name: "shinkansen", ways: sections.filter((f) => f.properties.N02_002 === "1") },
  { name: "JR", ways: sections.filter((f) => ["1", "2"].includes(f.properties.N02_002)) },
  { name: "any railway", ways: sections },
];

/** Shortest path along the sections between `a` and `b` (track within 12 km of each city). */
function trace(ways, a, b) {
  const pos = new Map();
  const adj = new Map();
  const link = (u, v, w) => { if (!adj.has(u)) adj.set(u, []); adj.get(u).push([v, w]); };
  for (const w of ways) {
    const lines = w.geometry.type === "MultiLineString" ? w.geometry.coordinates : [w.geometry.coordinates];
    for (const line of lines) {
      const ids = line.map(([x, y]) => `${x.toFixed(5)},${y.toFixed(5)}`); // sections meet on shared points
      for (let i = 0; i < ids.length; i++) {
        pos.set(ids[i], line[i]);
        if (i) {
          const d = km(line[i - 1], line[i]);
          link(ids[i - 1], ids[i], d);
          link(ids[i], ids[i - 1], d);
        }
      }
    }
  }
  // sections that should meet sometimes end a few metres apart: join section ends within 150 m
  const ends = [...adj.keys()].filter((id) => adj.get(id).length === 1);
  const grid = new Map();
  for (const id of ends) { const [x, y] = pos.get(id); const k = `${Math.floor(x / 0.002)},${Math.floor(y / 0.002)}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(id); }
  for (const id of ends) {
    const [x, y] = pos.get(id);
    const gx = Math.floor(x / 0.002), gy = Math.floor(y / 0.002);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const other of grid.get(`${gx + dx},${gy + dy}`) ?? []) {
      if (other === id) continue;
      const d = km(pos.get(id), pos.get(other));
      if (d <= 0.15) link(id, other, d);
    }
  }
  // Any track point within 12 km of a city can start/end the trace (walking from the centre costs
  // 1.5× its distance), so a city near two lines picks the one that actually goes the right way.
  const S = "@start", T = "@end";
  for (const [id, q] of pos) {
    const da = km(a, q), db = km(b, q);
    if (da <= 12) link(S, id, da * 1.5);
    if (db <= 12) link(id, T, db * 1.5);
  }
  if (!adj.has(S)) return null;
  // Dijkstra with a simple binary heap
  const dist = new Map([[S, 0]]), prev = new Map(), heap = [[0, S]];
  const push = (x) => { heap.push(x); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  while (heap.length) {
    const [d, u] = pop();
    if (u === T) break;
    if (d > (dist.get(u) ?? Infinity)) continue;
    for (const [v, w] of adj.get(u) ?? []) if (d + w < (dist.get(v) ?? Infinity)) { dist.set(v, d + w); prev.set(v, u); push([d + w, v]); }
  }
  if (!dist.has(T)) return null;
  const path = [prev.get(T)];
  while (prev.get(path[0]) !== S) path.unshift(prev.get(path[0]));
  return { coords: path.map((id) => pos.get(id)), km: dist.get(T) };
}

async function railShape(from, to) {
  const a = COORD.get(from), b = COORD.get(to);
  const pad = 0.4 + 0.3 * Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])); // long lines bow away from the straight box (Tokaido dips to Hamamatsu)
  const inBox = (f) => { const c = f.geometry.coordinates.flat(2); for (let i = 0; i < c.length; i += 2) if (c[i] >= Math.min(a[0], b[0]) - pad && c[i] <= Math.max(a[0], b[0]) + pad && c[i + 1] >= Math.min(a[1], b[1]) - pad && c[i + 1] <= Math.max(a[1], b[1]) + pad) return true; return false; };
  const straight = km(a, b);
  for (const tier of TIERS) {
    const got = trace(tier.ways.filter(inBox), a, b);
    // reject detours that make no sense for a direct visitor connection
    if (got && got.km <= straight * 2.2 + 10) return { tier: tier.name, coords: [a, ...got.coords, b] };
  }
  return null;
}

async function roadShape(from, to) {
  const a = COORD.get(from), b = COORD.get(to);
  const res = await fetch(`${OSRM}/${a.join(",")};${b.join(",")}?overview=full&geometries=geojson`, { headers: { "User-Agent": UA } });
  await sleep(1500);
  if (!res.ok) return null;
  const body = await res.json();
  const line = body.routes?.[0]?.geometry?.coordinates;
  return line ? { tier: "road", coords: [a, ...line, b] } : null;
}

const shapes = existsSync(OUT) && !ALL ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const missing = [];
for (const [from, to, , mode = "train"] of RAIL_EDGES) {
  if (from.startsWith("airport:") || to.startsWith("airport:")) continue; // the trip map draws cities only
  const key = `${from}|${to}`;
  if (shapes[key]) continue;
  if (!COORD.has(from) || !COORD.has(to)) { console.log(`${key}: no coordinates, skipped`); missing.push(key); continue; }
  if (mode === "ferry" || mode === "flight") { console.log(`${key}: ${mode}, stays straight`); continue; }
  try {
    const got = mode === "bus" ? await roadShape(from, to) : await railShape(from, to);
    if (!got) { console.log(`${key}: not traced (map draws it straight)`); missing.push(key); continue; }
    shapes[key] = round(simplify(got.coords));
    console.log(`${key}: ${got.tier}, ${shapes[key].length} points`);
    writeFileSync(OUT, JSON.stringify(shapes) + "\n"); // keep progress if the run stops
  } catch (e) {
    console.log(`${key}: ${e.message}`);
    missing.push(key);
  }
}
writeFileSync(OUT, JSON.stringify(shapes) + "\n");
console.log(`\n${Object.keys(shapes).length} connections drawn along the line${missing.length ? ` · straight: ${missing.join(", ")}` : ""}`);
