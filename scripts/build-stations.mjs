// Where each base city's main station / bus terminal / port really is (OpenStreetMap via Nominatim),
// so place cards can say "ห่างสถานีเกียวโต 1.2 กม." The city points in lib/cities are rough
// (2 decimals — Nagasaki's sits ~4 km north of the station), so they are not used for distances.
//
// Run: node scripts/build-stations.mjs   → data/transport/stations.json
// Nominatim usage policy: ≤1 request/s, a real User-Agent, results cached in the repo (this file).
// Each hit must lie within 20 km of the city point, or it is left out (no distance shown there).

import { readFileSync, writeFileSync } from "node:fs";

const OUT = new URL("../data/transport/stations.json", import.meta.url);
const UA = "nagame-tabi/1.0 (station coordinates for a trip planner; contact via github.com/Kokonattp)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// base cities: name + rough point (lib/cities/japan-major-cities.ts and TABI_EXTRA_BASES in lib/tabi/cities.ts)
const cities = new Map();
for (const file of ["../lib/cities/japan-major-cities.ts", "../lib/tabi/cities.ts"]) {
  const src = readFileSync(new URL(file, import.meta.url), "utf8");
  for (const m of src.matchAll(/name: "([^"]+)"[^}]*?lat: ([\d.]+), lon: ([\d.]+)[^}]*?prefecture: "([^"]+)"/g)) {
    cities.set(m[1], { lat: +m[2], lon: +m[3], prefecture: m[4] });
  }
  // the major-city seeds are tuples: ["Kyoto", "京都", "Kyoto", 35.0116, 135.7681] (name, ja, prefecture, lat, lon)
  for (const m of src.matchAll(/\["([^"]+)", "[^"]*", "([^"]+)", ([\d.]+), ([\d.]+)\]/g)) {
    cities.set(m[1], { lat: +m[3], lon: +m[4], prefecture: m[2] });
  }
}
// the station / terminal / port a traveller arrives at (lib/tabi/transport.ts STATION, else "<city> Station")
const transport = readFileSync(new URL("../lib/tabi/transport.ts", import.meta.url), "utf8");
const block = transport.slice(transport.indexOf("const STATION"), transport.indexOf("};", transport.indexOf("const STATION")));
const named = Object.fromEntries([...block.matchAll(/^\s*"?([^":\n]+?)"?: "([^"]+)",/gm)].map((m) => [m[1].trim(), m[2]]));
const stationFor = (city) => named[city] ?? `${city} Station`;
// only real departure points get a distance (a town name or an airport is not "the station")
const IS_STOP = / Station$| Bus (?:Terminal|Center|Stop)$| Port(?: Terminal)?$/;

const km = (a, b) => {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

async function find(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=jp&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "en" } });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  return res.json();
}

const old = (() => { try { return JSON.parse(readFileSync(OUT, "utf8")).stations; } catch { return {}; } })();
const stations = {};
const skipped = [];
for (const [city, c] of cities) {
  const stop = stationFor(city);
  if (!IS_STOP.test(stop)) { skipped.push(`${city} (${stop}: not a station)`); continue; }
  if (old[city]?.name === stop) { stations[city] = old[city]; continue; } // already looked up
  await sleep(1100);
  let hits = [];
  try { hits = await find(`${stop}, ${c.prefecture}, Japan`); } catch (e) { skipped.push(`${city} (${e.message})`); continue; }
  // prefer railway / bus / ferry places, nearest to the city point
  const ok = hits
    .map((h) => ({ h, d: km(c, { lat: +h.lat, lon: +h.lon }) }))
    .filter((x) => x.d <= 20)
    .sort((a, b) => Number(/railway|station|bus|ferry|harbour|terminal/i.test(b.h.category + b.h.type)) - Number(/railway|station|bus|ferry|harbour|terminal/i.test(a.h.category + a.h.type)) || a.d - b.d);
  if (!ok.length) { skipped.push(`${city} (${stop}: no hit within 20 km)`); continue; }
  const best = ok[0].h;
  stations[city] = { name: stop, lat: Math.round(+best.lat * 1e5) / 1e5, lon: Math.round(+best.lon * 1e5) / 1e5, osm: `${best.osm_type}/${best.osm_id}` };
  console.log(`${city}: ${stop} → ${stations[city].lat},${stations[city].lon} (${ok[0].d.toFixed(1)} km from city point, ${best.category}/${best.type})`);
}
writeFileSync(OUT, JSON.stringify({ source: "OpenStreetMap contributors (ODbL), via Nominatim", checkedAt: new Date().toISOString().slice(0, 10), stations }, null, 1) + "\n");
console.log(`\n${Object.keys(stations).length} stations written, ${skipped.length} skipped:\n  ${skipped.join("\n  ")}`);
