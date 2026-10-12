// Monthly weather normals for every base city, so Tabi can answer "หิมะจะตกไหม" / "หนาวไหม"
// from numbers instead of guesses. Source: Open-Meteo historical weather API (ERA5 reanalysis),
// daily values 2015–2024, data CC BY 4.0 (credited where shown). Writes data/weather/normals.json:
//   { "Sapporo": [[tmax, tmin, rainDays, snowDays], …12 months], … }
//   rainDays = days with ≥ 1 mm precipitation, snowDays = days with ≥ 1 cm fresh snow (monthly means)
//
//   node scripts/build-weather-normals.mjs          (only cities missing from the file)
//   node scripts/build-weather-normals.mjs --all

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const OUT = new URL("../data/weather/normals.json", import.meta.url);
const ALL = process.argv.includes("--all");
const UA = "nagame-tabi/1.0 (weather normals build; https://nagame.vercel.app)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// same city points as the planner (lib/cities/japan-major-cities.ts + extra bases in lib/tabi/cities.ts)
const COORD = new Map();
const major = readFileSync(new URL("../lib/cities/japan-major-cities.ts", import.meta.url), "utf8");
for (const m of major.matchAll(/\["([^"]+)",\s*"[^"]*",\s*"[^"]*",\s*([\d.]+),\s*([\d.]+)/g)) COORD.set(m[1], [Number(m[2]), Number(m[3])]);
const extra = readFileSync(new URL("../lib/tabi/cities.ts", import.meta.url), "utf8");
for (const m of extra.matchAll(/name:\s*"([^"]+)",\s*th:\s*"[^"]*",\s*lat:\s*([\d.]+),\s*lon:\s*([\d.]+)/g)) COORD.set(m[1], [Number(m[2]), Number(m[3])]);

mkdirSync(new URL("../data/weather/", import.meta.url), { recursive: true });
const normals = existsSync(OUT) && !ALL ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const r1 = (x) => Math.round(x * 10) / 10;

for (const [city, [lat, lon]] of COORD) {
  if (normals[city]) continue;
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=2015-01-01&end_date=2024-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum&timezone=Asia%2FTokyo`;
  let body = null;
  for (let attempt = 0; attempt < 4 && !body; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) body = await res.json();
    else { console.log(`  ${city}: HTTP ${res.status}, retrying`); await sleep(20000 * (attempt + 1)); }
  }
  if (!body) { console.log(`${city}: skipped`); continue; }
  const d = body.daily;
  const acc = Array.from({ length: 12 }, () => ({ tmax: 0, tmin: 0, n: 0, rain: 0, snow: 0 }));
  const years = new Set();
  d.time.forEach((t, i) => {
    const m = Number(t.slice(5, 7)) - 1;
    years.add(t.slice(0, 4));
    if (d.temperature_2m_max[i] == null) return;
    const a = acc[m];
    a.tmax += d.temperature_2m_max[i];
    a.tmin += d.temperature_2m_min[i];
    a.n++;
    if ((d.precipitation_sum[i] ?? 0) >= 1) a.rain++;
    if ((d.snowfall_sum[i] ?? 0) >= 1) a.snow++;
  });
  const y = years.size;
  normals[city] = acc.map((a) => [r1(a.tmax / a.n), r1(a.tmin / a.n), r1(a.rain / y), r1(a.snow / y)]);
  console.log(`${city}: Jan ${normals[city][0].join("/")} · Aug ${normals[city][7].join("/")}`);
  writeFileSync(OUT, JSON.stringify(normals) + "\n");
  await sleep(1500);
}
writeFileSync(OUT, JSON.stringify(normals) + "\n");
console.log(`\n${Object.keys(normals).length} cities`);
