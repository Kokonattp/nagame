// Travel times for the Tabi-only base cities (TABI_EXTRA_BASES), computed instead of typed in.
// The 60 hand-checked connections in lib/tabi/rail-times.ts stay as they are; this script adds
// data/transport/rail-times-generated.json: [[from, to, minutes, mode?], …] that rail-times.ts merges.
//
// Model (calibrated against the hand-checked connections, see the report it prints):
//   train — shortest time along the real track (国土数値情報 N02-23, MLIT, CC BY 4.0) with a speed
//           per kind of line, plus getting from the town centre to the line and a boarding allowance
//   bus   — the road route's driving time from the public OSRM server × 1.45 + 10 min (no rail nearby,
//           or the road is quicker, e.g. Shirakawa-go ⇄ Takayama)
//   ferry / flight — islands, from published timetables (ISLANDS below)
// Each new city is joined to its nearest bases (existing or new); the app chains them with a
// 20-minute transfer like any other connection, labels every time "ประมาณ", and links Google Maps.
//
//   node scripts/build-rail-times.mjs [--report]   (N02 file as in scripts/build-rail-shapes.mjs)

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { RAIL_EDGES } from "../lib/tabi/rail-edges.ts";

const OUT = new URL("../data/transport/rail-times-generated.json", import.meta.url);
const CACHE = new URL("../data/places/_cache/osrm-durations.json", import.meta.url);
const N02 = process.env.N02_GEOJSON ?? "D:/TT/nagame-workers/cache/n02/UTF-8/N02-23_RailroadSection.geojson";
const UA = "nagame-tabi/1.0 (travel time build; https://nagame.vercel.app)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── cities ──
const COORD = new Map();
const major = readFileSync(new URL("../lib/cities/japan-major-cities.ts", import.meta.url), "utf8");
for (const m of major.matchAll(/\["([^"]+)",\s*"[^"]*",\s*"[^"]*",\s*([\d.]+),\s*([\d.]+)/g)) COORD.set(m[1], [Number(m[3]), Number(m[2])]);
const tabi = readFileSync(new URL("../lib/tabi/cities.ts", import.meta.url), "utf8");
const NEW = [];
for (const m of tabi.matchAll(/\{ name: "([^"]+)", th: "[^"]*", lat: ([\d.]+), lon: ([\d.]+), prefecture/g)) {
  COORD.set(m[1], [Number(m[3]), Number(m[2])]);
  if (m[1] !== "Toyama") NEW.push(m[1]); // Toyama already has hand-checked connections
}

// islands and sea crossings (published fastest boat/flight + check-in/transfer allowance)
const ISLANDS = [
  ["Sado", "Niigata", 90, "ferry"],        // jetfoil 67 min
  ["Yakushima", "Kagoshima", 150, "ferry"], // jetfoil ~2 h from Kagoshima port
  ["Zamami", "Naha", 70, "ferry"],          // high-speed boat 50 min from Tomari port
  ["Iriomote", "Ishigaki", 60, "ferry"],    // 40–50 min from Ishigaki port
  ["Miyakojima", "Naha", 140, "flight"],    // 50 min flight + airport time
];
const ISLAND = new Set(ISLANDS.flatMap(([a, b]) => [a, b]).filter((c) => NEW.includes(c)));

const R = Math.PI / 180;
const km = ([lon1, lat1], [lon2, lat2]) => 12742 * Math.asin(Math.sqrt(Math.sin(((lat2 - lat1) * R) / 2) ** 2 + Math.cos(lat1 * R) * Math.cos(lat2 * R) * Math.sin(((lon2 - lon1) * R) / 2) ** 2));

// ── rail graph: minutes per km by kind of line ──
// N02_002: 1 Shinkansen · 2 JR conventional · 3 public (subways) · 4 private · 5 third-sector.
// JR "本線" trunk lines carry the limited expresses; other JR lines and mountain railways are slower.
let SPEED = { 1: 270, 2: 90, b: 55, 3: 30, 4: 45, 5: 40 }; // km/h, tuned below ("b" = JR branch line)
// JR lines without "本線" in the name that limited expresses / mini-shinkansen run on
// non-JR lines with limited expresses as fast as JR trunk lines (operator|line): Super Hakuto on the
// Chizu Express, Kintetsu to Ise, Odakyu Romancecar to Hakone, Tobu to Nikko, Nankai/Meitetsu/Keisei
// airport expresses, the Hokuhoku line. Counted at the JR trunk speed. Not the Izukyu line: its
// coast curves keep the Odoriko slow (Tokyo–Shimoda ~2 h 40), and an underestimate makes people miss trains.
const PRIVATE_EXPRESS = new Set([
  "智頭急行|智頭線", "北越急行|ほくほく線",
  "近畿日本鉄道|山田線", "近畿日本鉄道|大阪線", "近畿日本鉄道|鳥羽線", "近畿日本鉄道|名古屋線",
  "小田急電鉄|小田原線", "東武鉄道|伊勢崎線", "東武鉄道|日光線", "西武鉄道|池袋線",
  "南海電気鉄道|南海本線", "南海電気鉄道|空港線", "名古屋鉄道|名古屋本線", "名古屋鉄道|空港線",
  "京成電鉄|本線", "京成電鉄|成田空港線",
]);
const EXPRESS_LINES = new Set(["湖西線", "予讃線", "土讃線", "高徳線", "伯備線", "田沢湖線", "石勝線", "千歳線", "本四備讃線", "宇野線", "篠ノ井線", "身延線", "播但線", "徳島線", "上越線", "吾妻線", "日光線", "成田線", "総武線", "内房線", "外房線", "鹿島線", "常磐線", "宗谷本線", "釧網本線", "石北本線", "富良野線", "室蘭本線"]);
let ACCESS = 40, BOARD = 5; // town centre → line (km/h), boarding allowance (min), tuned below
const sections = JSON.parse(readFileSync(N02, "utf8")).features.filter((f) => ["11", "12"].includes(f.properties.N02_001));
const pos = new Map();
const adj = new Map();
const link = (u, v, d, kind) => { if (!adj.has(u)) adj.set(u, []); adj.get(u).push([v, d, kind]); };
for (const f of sections) {
  const lines = f.geometry.type === "MultiLineString" ? f.geometry.coordinates : [f.geometry.coordinates];
  for (const line of lines) {
    const ids = line.map(([x, y]) => `${x.toFixed(5)},${y.toFixed(5)}`);
    for (let i = 0; i < ids.length; i++) {
      pos.set(ids[i], line[i]);
      const kind = PRIVATE_EXPRESS.has(`${f.properties.N02_004}|${f.properties.N02_003}`) ? "2"
        : f.properties.N02_002 === "2" && !f.properties.N02_003.includes("本線") && !EXPRESS_LINES.has(f.properties.N02_003) ? "b" : f.properties.N02_002;
      if (i) { const d = km(line[i - 1], line[i]); link(ids[i - 1], ids[i], d, kind); link(ids[i], ids[i - 1], d, kind); }
    }
  }
}
// sections ending a few metres apart, and interchanges where lines run side by side at a station (≤ 300 m, walking)
const grid = new Map();
const cell = ([x, y]) => `${Math.floor(x / 0.004)},${Math.floor(y / 0.004)}`;
for (const [id, p] of pos) { const k = cell(p); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(id); }
for (const id of [...adj.keys()].filter((k) => adj.get(k).length === 1)) {
  const [x, y] = pos.get(id);
  const gx = Math.floor(x / 0.004), gy = Math.floor(y / 0.004);
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const o of grid.get(`${gx + dx},${gy + dy}`) ?? []) {
    if (o === id) continue;
    const d = km(pos.get(id), pos.get(o));
    if (d <= 0.3) { link(id, o, d, "walk"); link(o, id, d, "walk"); }
  }
}
// nodes near a point (town centre → line)
const near = (p, within) => { const out = []; for (const [id, q] of pos) { const d = km(p, q); if (d <= within) out.push([id, d]); } return out; };
const nearCache = new Map();
const nearCity = (c) => { if (!nearCache.has(c)) nearCache.set(c, near(COORD.get(c), 15)); return nearCache.get(c); };

/** Fastest rail minutes between two cities, or null. Access: ≤ 15 km to the line at ACCESS km/h. */
function railMinutes(a, b) {
  const minutesPerKm = (kind) => (kind === "walk" ? 60 / 4 : 60 / SPEED[kind]);
  const S = nearCity(a), T = new Map(nearCity(b).map(([id, d]) => [id, d]));
  if (!S.length || !T.size) return null;
  const dist = new Map(), heap = [];
  const push = (x) => { heap.push(x); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  for (const [id, d] of S) { const t = d / ACCESS * 60; if (t < (dist.get(id) ?? Infinity)) { dist.set(id, t); push([t, id]); } }
  let best = Infinity;
  const cap = km(COORD.get(a), COORD.get(b)) * 3 / 30 * 60 + 120; // never explore wildly past a plausible time
  while (heap.length) {
    const [t, u] = pop();
    if (t >= best || t > cap) break;
    if (t > (dist.get(u) ?? Infinity)) continue;
    if (T.has(u)) best = Math.min(best, t + T.get(u) / ACCESS * 60);
    for (const [v, d, kind] of adj.get(u) ?? []) {
      const nt = t + d * minutesPerKm(kind);
      if (nt < (dist.get(v) ?? Infinity)) { dist.set(v, nt); push([nt, v]); }
    }
  }
  return Number.isFinite(best) ? best + BOARD : null; // boarding / waiting allowance
}

// ── road ──
const osrm = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
async function busMinutes(a, b) {
  const key = [a, b].sort().join("|");
  if (!(key in osrm)) {
    const [p, q] = [COORD.get(a), COORD.get(b)];
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${p.join(",")};${q.join(",")}?overview=false`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
      osrm[key] = res.ok ? ((await res.json()).routes?.[0]?.duration ?? null) : null;
    } catch { osrm[key] = null; }
    writeFileSync(CACHE, JSON.stringify(osrm));
    await sleep(1100);
  }
  // buses are slower than the car route (stops, mountain roads): checked on Shirakawa-go, Kusatsu, Hakuba
  return osrm[key] == null ? null : osrm[key] / 60 * 1.45 + 10;
}

// ── calibrate on the hand-checked train connections ──
const checked = RAIL_EDGES.filter(([a, b, , mode = "train"]) => mode === "train" && !a.startsWith("airport:") && !b.startsWith("airport:") && COORD.has(a) && COORD.has(b));
function errors() {
  return checked.map(([a, b, real]) => { const m = railMinutes(a, b); return m == null ? null : { a, b, real, model: Math.round(m), err: Math.round(m - real) }; }).filter(Boolean);
}
function summary(rows) {
  const abs = rows.map((r) => Math.abs(r.err)).sort((x, y) => x - y);
  return { n: rows.length, median: abs[Math.floor(abs.length / 2)], p90: abs[Math.floor(abs.length * 0.9)], within30: rows.filter((r) => Math.abs(r.err) <= 30).length };
}
let best = { score: Infinity };
for (const s1 of [250, 290]) for (const s2 of [85, 100]) for (const sb of [45, 60]) for (const s4 of [35, 45]) {
  const access = 40, board = 10;
  SPEED = { 1: s1, 2: s2, b: sb, 3: 30, 4: s4, 5: s4 - 5 };
  ACCESS = access; BOARD = board;
  const rows = errors();
  // an underestimate hurts more than an overestimate (too little time budgeted), so it counts double
  const score = rows.reduce((a, r) => a + (r.err < 0 ? -2 * r.err : r.err), 0) / rows.length;
  if (score < best.score) best = { score, speed: { ...SPEED }, access, board };
}
SPEED = best.speed; ACCESS = best.access; BOARD = best.board;
const calib = errors();
console.log("speeds km/h:", JSON.stringify(SPEED), "access", ACCESS, "board", BOARD, "· vs hand-checked:", JSON.stringify(summary(calib)));
if (process.argv.includes("--report")) for (const r of calib.sort((x, y) => Math.abs(y.err) - Math.abs(x.err)).slice(0, 12)) console.log(`  ${r.a}–${r.b}: checked ${r.real} · model ${r.model} (${r.err > 0 ? "+" : ""}${r.err})`);

// ── connect every new city to its nearest bases ──
const ALL = [...COORD.keys()];
const out = [];
const have = new Set(RAIL_EDGES.map(([a, b]) => [a, b].sort().join("|")));
const add = (a, b, minutes, mode) => {
  const key = [a, b].sort().join("|");
  if (have.has(key)) return;
  have.add(key);
  out.push(mode === "train" ? [a, b, minutes] : [a, b, minutes, mode]);
};
for (const [a, b, m, mode] of ISLANDS) add(a, b, m, mode);
for (const city of NEW) {
  if (ISLAND.has(city)) continue;
  const p = COORD.get(city);
  const others = ALL.filter((o) => o !== city && !ISLAND.has(o) && !["Naha", "Ishigaki"].includes(o) || (o === "Naha" && ["Nago"].includes(city)))
    .map((o) => ({ o, d: km(p, COORD.get(o)) })).filter((x) => x.o !== city).sort((x, y) => x.d - y.d).slice(0, 3).filter((x) => x.d <= 220);
  // also straight to the nearest big hubs, so a trip to a hub is not a chain of small-town transfers
  const HUBS = ["Tokyo", "Osaka", "Kyoto", "Nagoya", "Sendai", "Sapporo", "Fukuoka", "Hiroshima", "Okayama", "Kanazawa", "Takamatsu", "Kagoshima", "Kumamoto", "Niigata", "Nagano", "Aomori"];
  const hubs = HUBS.filter((h) => h !== city && COORD.has(h) && !others.some((x) => x.o === h))
    .map((o) => ({ o, d: km(p, COORD.get(o)) })).sort((x, y) => x.d - y.d).slice(0, 2).filter((x) => x.d <= 320);
  for (const { o } of [...others, ...hubs]) {
    const rail = railMinutes(city, o);
    const bus = await busMinutes(city, o);
    const options = [rail != null && { m: rail, mode: "train" }, bus != null && { m: bus, mode: "bus" }].filter(Boolean).sort((x, y) => x.m - y.m);
    if (!options.length || options[0].m > 300) continue;
    const pick = options[0];
    add(city, o, Math.round(pick.m / 5) * 5, pick.mode);
  }
}
writeFileSync(OUT, JSON.stringify(out) + "\n");
console.log(`${out.length} connections for ${NEW.length} new cities → data/transport/rail-times-generated.json`);
const lonely = NEW.filter((c) => !out.some(([a, b]) => a === c || b === c));
if (lonely.length) console.log("not connected:", lonely.join(", "));
