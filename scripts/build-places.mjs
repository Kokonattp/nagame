// Builds the Tabi place store: data/places/places.json
//   1. Wikidata (CC0): Japanese attractions per class, closed/demolished items excluded
//   2. Wikipedia intro text (CC BY-SA) — used only as Jev input, never shipped to the app
//   2b. Thai names (Wikidata Thai label or Thai Wikipedia title) for display
//   3. Jev scores each place once (crowd, season, audience, tags, "closed?")
//   4. Code adds nearest base city + region
// Every stage caches under data/places/_cache, so re-runs skip finished work.
//
// Run: node --env-file=.env.local scripts/build-places.mjs [--limit=2000]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { askSystemOne } from "../lib/tabi/system-one.ts";

const ROOT = new URL("../data/places/", import.meta.url);
const CACHE = new URL("./_cache/", ROOT);
mkdirSync(CACHE, { recursive: true });
const UA = "nagame-place-store/0.1 (https://nagame.vercel.app)";
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 2000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = (name, fallback) => (existsSync(new URL(name, CACHE)) ? JSON.parse(readFileSync(new URL(name, CACHE), "utf8")) : fallback);
const writeJson = (url, value) => writeFileSync(url, JSON.stringify(value, null, 1));

// ── 1. Wikidata, one small query per class (big unions time out: M0 saw 504/500) ──
const CLASSES = {
  Q845945: "shrine_temple", Q5393308: "shrine_temple", Q177380: "onsen", Q8502: "nature",
  Q46169: "nature", Q23397: "nature", Q34038: "nature", Q1107656: "nature", Q22698: "nature",
  Q23413: "castle", Q33506: "museum", Q207694: "museum", Q2416723: "theme_park",
  Q12518: "landmark", Q570116: "landmark",
  // Japan-specific classes (generic "castle"/"hot spring" returned 2–3 rows in the trial run)
  Q92026: "castle", Q655311: "onsen", Q15835: "nature", Q11832860: "nature",
};

async function wikidataClass(qid) {
  const cacheName = `wikidata-${qid}.json`;
  const cached = readJson(cacheName, null);
  if (cached) return cached;
  const query = `
SELECT ?item ?labelEn ?labelJa ?coord ?sl ?article WHERE {
  ?item wdt:P31 wd:${qid}; wdt:P17 wd:Q17; wdt:P625 ?coord; wikibase:sitelinks ?sl.
  FILTER(?sl >= 5)
  FILTER NOT EXISTS { ?item wdt:P576 [] }
  FILTER NOT EXISTS { ?item wdt:P3999 [] }
  ?article schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>.
  ?item rdfs:label ?labelEn FILTER(LANG(?labelEn) = "en")
  OPTIONAL { ?item rdfs:label ?labelJa FILTER(LANG(?labelJa) = "ja") }
}
ORDER BY DESC(?sl) LIMIT 400`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch("https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(query), {
      headers: { "User-Agent": UA, Accept: "application/sparql-results+json" },
    });
    if (res.ok) {
      const rows = (await res.json()).results.bindings;
      writeJson(new URL(cacheName, CACHE), rows);
      return rows;
    }
    console.warn(`  ${qid}: HTTP ${res.status}, retrying in ${10 * (attempt + 1)}s`);
    await sleep(10_000 * (attempt + 1));
  }
  console.warn(`  ${qid}: skipped after 3 attempts`);
  return [];
}

const byId = new Map();
for (const [qid, type] of Object.entries(CLASSES)) {
  const rows = await wikidataClass(qid);
  for (const b of rows) {
    const id = b.item.value.split("/").pop();
    if (byId.has(id)) continue;
    const [lon, lat] = b.coord.value.replace("Point(", "").replace(")", "").split(" ").map(Number);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    byId.set(id, {
      id, type, lat, lon,
      nameEn: b.labelEn.value,
      nameJa: b.labelJa?.value ?? null,
      sitelinks: Number(b.sl.value),
      wikiTitle: decodeURIComponent(b.article.value.split("/wiki/").pop()).replaceAll("_", " "),
    });
  }
  console.log(`wikidata ${qid} (${type}): ${rows.length} rows, ${byId.size} unique so far`);
  await sleep(2000);
}
// ── 1b. Must-see places the class queries miss (data/places/must-see.json): title → Wikidata item ──
const mustSee = JSON.parse(readFileSync(new URL("must-see.json", ROOT), "utf8")).places;
const extras = readJson("must-see.json", {});
const needIds = mustSee.filter(([title]) => !(title in extras));
for (let i = 0; i < needIds.length; i += 50) {
  const batch = needIds.slice(i, i + 50).map(([t]) => t);
  const url = "https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=pageprops&ppprop=wikibase_item" +
    "&redirects=1&titles=" + encodeURIComponent(batch.join("|"));
  const q = (await (await fetch(url, { headers: { "User-Agent": UA } })).json()).query;
  const rename = new Map([...(q.normalized ?? []), ...(q.redirects ?? [])].map((x) => [x.from, x.to]));
  const pages = new Map(q.pages.map((pg) => [pg.title, pg]));
  for (const t of batch) {
    let title = t;
    while (rename.has(title)) title = rename.get(title);
    const pg = pages.get(title);
    extras[t] = pg?.pageprops?.wikibase_item ? { id: pg.pageprops.wikibase_item, wikiTitle: pg.title } : null;
  }
  await sleep(500);
}
const extraIds = Object.values(extras).filter((x) => x && !x.entity).map((x) => x.id);
for (let i = 0; i < extraIds.length; i += 50) {
  const ids = extraIds.slice(i, i + 50);
  const url = "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels|claims|sitelinks&languages=en|ja&ids=" + ids.join("|");
  const entities = (await (await fetch(url, { headers: { "User-Agent": UA } })).json()).entities ?? {};
  for (const x of Object.values(extras)) {
    const e = x && entities[x.id];
    if (!e) continue;
    const coord = e.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
    x.entity = { en: e.labels?.en?.value ?? x.wikiTitle, ja: e.labels?.ja?.value ?? null, lat: coord?.latitude ?? null, lon: coord?.longitude ?? null, sitelinks: Object.keys(e.sitelinks ?? {}).length };
  }
  await sleep(500);
}
writeJson(new URL("must-see.json", CACHE), extras);
let mustSeeAdded = 0;
const mustSeeIds = new Set();
const thaiOverride = new Map(); // [title, type, "ชื่อไทยที่คนไทยใช้"] when Wikidata's Thai label is not the common name
for (const [title, type, th] of mustSee) {
  const x = extras[title];
  if (!x?.entity || x.entity.lat == null) { console.warn(`  must-see skipped (no item/coords): ${title}`); continue; }
  mustSeeIds.add(x.id);
  if (th) thaiOverride.set(x.id, th);
  const known = byId.get(x.id);
  if (known) { if (type === "food_area") known.type = type; continue; }
  byId.set(x.id, { id: x.id, type, lat: x.entity.lat, lon: x.entity.lon, nameEn: x.entity.en, nameJa: x.entity.ja, sitelinks: x.entity.sitelinks, wikiTitle: x.wikiTitle });
  mustSeeAdded++;
}
console.log(`must-see: ${mustSeeAdded} added, ${mustSee.length - mustSeeAdded} already known or skipped`);

const places = [...byId.values()].sort((a, b) => b.sitelinks - a.sitelinks).slice(0, LIMIT);
console.log(`candidates: ${places.length}`);

// ── 2. Wikipedia intros, 20 titles per request (one-by-one calls hit HTTP 429 in M0) ──
const summaries = readJson("summaries.json", {});
const missing = places.filter((p) => !(p.wikiTitle in summaries));
for (let i = 0; i < missing.length; i += 20) {
  const batch = missing.slice(i, i + 20);
  const url = "https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=extracts" +
    "&exintro=1&explaintext=1&exlimit=20&redirects=1&titles=" + encodeURIComponent(batch.map((p) => p.wikiTitle).join("|"));
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) { console.warn(`wikipedia HTTP ${res.status}; stopping summaries early`); break; }
  const q = (await res.json()).query;
  const rename = new Map([...(q.normalized ?? []), ...(q.redirects ?? [])].map((x) => [x.from, x.to]));
  const extracts = new Map(q.pages.map((pg) => [pg.title, pg.extract ?? ""]));
  for (const p of batch) {
    let t = p.wikiTitle;
    while (rename.has(t)) t = rename.get(t);
    summaries[p.wikiTitle] = (extracts.get(t) ?? "").slice(0, 1200);
  }
  writeJson(new URL("summaries.json", CACHE), summaries);
  if (i % 200 === 0) console.log(`summaries ${Math.min(i + 20, missing.length)}/${missing.length}`);
  await sleep(1000);
}

// ── 2b. Thai names: Wikidata Thai label, else the Thai Wikipedia title (both free, CC0 / title only) ──
const thai = readJson("labels-th.json", {});
const needTh = places.filter((p) => !(p.id in thai));
for (let i = 0; i < needTh.length; i += 50) {
  const batch = needTh.slice(i, i + 50);
  const url = "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels|sitelinks" +
    "&languages=th&sitefilter=thwiki&ids=" + batch.map((p) => p.id).join("|");
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) { console.warn(`wikidata labels HTTP ${res.status}; stopping Thai names early`); break; }
  const entities = (await res.json()).entities ?? {};
  for (const p of batch) {
    const e = entities[p.id];
    thai[p.id] = e?.labels?.th?.value ?? e?.sitelinks?.thwiki?.title ?? null;
  }
  writeJson(new URL("labels-th.json", CACHE), thai);
  await sleep(500);
}
console.log(`thai names: ${places.filter((p) => thai[p.id]).length}/${places.length}`);

// ── 3. Jev scores, once per place (all questions in one request) ──
const TAGS = {
  nature: "nature, mountains, lakes, gardens or scenery",
  snow: "snow or winter activities",
  onsen: "hot springs / onsen",
  food: "food or local cuisine is a main draw",
  shopping: "shopping",
  culture: "temples, shrines, castles, history or traditional culture",
  scenic_photo: "photogenic views or seasonal colors",
};
const QUESTIONS = {
  closed: {
    type: "noul",
    instructions: "Is `place` permanently closed, demolished, relocated, or not open to the public (e.g. restricted military land)? Use past-tense wording in `place.description` as evidence.",
  },
  crowd: {
    type: "score",
    instructions: "Compared with Japan's busiest sights such as Fushimi Inari, Senso-ji or Tokyo Disneyland (the top level), how crowded is `place` with tourists on a typical visit?",
    criteria: [
      "Quiet; few tourists even in season",
      "Some visitors; rarely crowded",
      "Moderately busy in season",
      "Busy; queues common",
      "As crowded as Japan's busiest sights",
    ],
  },
  best_season: {
    type: "choice",
    instructions: "Which season is `place` best known for or best to visit? If it is closed or inaccessible in some season, never pick that season.",
    criteria: {
      spring: "Spring (Mar–May), e.g. cherry blossoms, snow walls",
      summer: "Summer (Jun–Aug)",
      autumn: "Autumn (Sep–Nov), e.g. autumn leaves",
      winter: "Winter (Dec–Feb), e.g. snow, illuminations",
      all_year: "Good all year, no strong seasonal peak",
    },
  },
  first_timer: { type: "noul", instructions: "Is `place` easy to reach and worthwhile for a first-time visitor to Japan?" },
  family: { type: "noul", instructions: "Is `place` suitable for a family with young children?" },
  ...Object.fromEntries(Object.entries(TAGS).map(([k, d]) => [`tag_${k}`, { type: "noul", instructions: `Is \`place\` a good match for travellers who want: ${d}?` }])),
};

const scores = readJson("scores.json", {});
const todo = places.filter((p) => !scores[p.id]);
let usage = { requests: 0, inputTokens: 0, latencies: [] };
let done = 0;
async function scoreOne(p) {
  const state = { place: { name: p.nameEn, japanese_name: p.nameJa, kind: p.type, description: summaries[p.wikiTitle] ?? "" } };
  try {
    const a = await askSystemOne(state, QUESTIONS, {
      timeoutMs: 15000,
      onUsage: (u) => { usage.requests++; usage.inputTokens += u.inputTokens ?? 0; usage.latencies.push(u.latencyMs); },
    });
    scores[p.id] = {
      closed: a.closed.noul,
      crowd: a.crowd.score + 1,
      season: a.best_season.choice,
      firstTimer: a.first_timer.noul,
      family: a.family.noul,
      tags: Object.fromEntries(Object.keys(TAGS).map((k) => [k, a[`tag_${k}`].noul])),
    };
  } catch (err) {
    console.warn(`  score failed: ${p.nameEn}: ${err.message}`);
  }
  if (++done % 50 === 0) {
    writeJson(new URL("scores.json", CACHE), scores);
    console.log(`scores ${done}/${todo.length}`);
  }
}
const CONCURRENCY = 4;
for (let i = 0; i < todo.length; i += CONCURRENCY) await Promise.all(todo.slice(i, i + CONCURRENCY).map(scoreOne));
writeJson(new URL("scores.json", CACHE), scores);

// ── 4. Nearest base city + region (code) ──
const cityFile = readFileSync(new URL("../lib/cities/japan-major-cities.ts", import.meta.url), "utf8");
const CITIES = [...cityFile.matchAll(/\["([^"]+)", "([^"]+)", "([^"]+)", ([\d.]+), ([\d.]+)\]/g)]
  .map(([, name, ja, prefecture, lat, lon]) => ({ name, ja, prefecture, lat: Number(lat), lon: Number(lon) }));
// Tabi-only bases (see TABI_EXTRA_BASES in lib/tabi/cities.ts)
const EXTRA_BASES = [{ name: "Toyama", ja: "富山", prefecture: "Toyama", lat: 36.6953, lon: 137.2113 }];
CITIES.push(...EXTRA_BASES);
const REGION = {
  Hokkaido: "hokkaido", Aomori: "tohoku", Miyagi: "tohoku", Tokyo: "kanto", Kanagawa: "kanto", Tochigi: "kanto",
  Yamanashi: "chubu", Nagano: "chubu", Toyama: "chubu", Aichi: "chubu", Ishikawa: "chubu", Gifu: "chubu", Shizuoka: "chubu",
  Osaka: "kansai", Kyoto: "kansai", Nara: "kansai", Hyogo: "kansai", Wakayama: "kansai",
  Hiroshima: "chugoku", Okayama: "chugoku", Kagawa: "shikoku", Ehime: "shikoku",
  Fukuoka: "kyushu", Kagoshima: "kyushu", Oita: "kyushu", Kumamoto: "kyushu", Okinawa: "okinawa",
};
const km = (a, b) => {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

const out = [];
let closedCount = 0;
for (const p of places) {
  const s = scores[p.id];
  if (!s) continue;
  if (s.closed >= 0.5) { closedCount++; continue; }
  const near = CITIES.map((c) => ({ c, d: km(p, c) })).sort((x, y) => x.d - y.d)[0];
  out.push({
    id: p.id, nameEn: p.nameEn, nameJa: p.nameJa, nameTh: thaiOverride.get(p.id) ?? thai[p.id] ?? null, type: p.type, mustSee: mustSeeIds.has(p.id) || undefined,
    lat: Number(p.lat.toFixed(5)), lon: Number(p.lon.toFixed(5)), sitelinks: p.sitelinks,
    baseCity: near.c.name, baseKm: Math.round(near.d), region: REGION[near.c.prefecture] ?? "other",
    crowd: Number(s.crowd.toFixed(1)), season: s.season,
    firstTimer: s.firstTimer >= 0.7, family: s.family >= 0.7,
    tags: Object.entries(s.tags).filter(([, v]) => v >= 0.7).map(([k]) => k),
    wikiTitle: p.wikiTitle,
  });
}
writeJson(new URL("places.json", ROOT), out);
const sorted = [...usage.latencies].sort((a, b) => a - b);
console.log(JSON.stringify({
  places: out.length, excludedClosed: closedCount, scoredThisRun: usage.requests,
  inputTokensThisRun: usage.inputTokens, medianLatencyMs: sorted[Math.floor(sorted.length / 2)] ?? null,
  byRegion: out.reduce((a, p) => ({ ...a, [p.region]: (a[p.region] ?? 0) + 1 }), {}),
}, null, 2));
