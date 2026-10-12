// Where to eat, shop and stay in every base city, from Wikivoyage's "Eat", "Buy" and "Sleep" listings
// (CC BY-SA 3.0, credited on screen). Big cities are split into district articles
// (Tokyo/Shinjuku, Osaka/Minami…), so their districts are read too. Only facts are kept
// (name, Japanese name, district, coordinates, price band, food/shop kind from keywords);
// the guide's prose is not shipped. Writes data/places/eat-buy.json:
//   { "Tokyo": [{ n, a?, k: "eat" | "buy" | "sleep", d?, la?, lo?, p?, t: [kinds] }, …], … }
//
//   node scripts/build-eat-buy.mjs           (cached pages are reused)
//   node scripts/build-eat-buy.mjs --fresh   (download every page again)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const OUT = new URL("../data/places/eat-buy.json", import.meta.url);
const CACHE_DIR = new URL("../data/places/_cache/", import.meta.url);
const CACHE = new URL("wikivoyage-pages.json", CACHE_DIR);
const UA = "nagame-tabi/1.0 (eat/buy build; https://nagame.vercel.app)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const major = readFileSync(new URL("../lib/cities/japan-major-cities.ts", import.meta.url), "utf8");
const extra = readFileSync(new URL("../lib/tabi/cities.ts", import.meta.url), "utf8");
const CITIES = [
  ...[...major.matchAll(/\["([^"]+)",\s*"[^"]*",\s*"[^"]*",\s*[\d.]+,\s*[\d.]+/g)].map((m) => m[1]),
  ...[...extra.matchAll(/name:\s*"([^"]+)",\s*th:\s*"[^"]*",\s*lat:/g)].map((m) => m[1]),
];
// Wikivoyage titles that differ from our base-city names (same as build-places.mjs)
const WV_TITLE = {
  Kawaguchiko: "Fujikawaguchiko", Izu: "Shuzenji",
  ...Object.fromEntries([...extra.matchAll(/\{ name: "([^"]+)",[^}]*wv: "([^"]+)" \}/g)].map((m) => [m[1], m[2]])),
};

mkdirSync(CACHE_DIR, { recursive: true });
const pages = existsSync(CACHE) && !process.argv.includes("--fresh") ? JSON.parse(readFileSync(CACHE, "utf8")) : {};

async function wikitext(title) {
  if (title in pages) return pages[title];
  const url = "https://en.wikivoyage.org/w/api.php?action=parse&format=json&formatversion=2&prop=wikitext&redirects=1&page=" + encodeURIComponent(title);
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) {
      const body = await res.json().catch(() => null);
      const text = body?.parse?.wikitext ?? "";
      pages[title] = text; // an empty page is a real answer (no article) and is cached
      writeFileSync(CACHE, JSON.stringify(pages));
      await sleep(800);
      return text;
    }
    await sleep(5000 * (attempt + 1)); // rate limited: do not cache a failure
  }
  return null;
}

// "| key=value"; the first field has no leading "|" (the template name consumed it)
const field = (body, key) => `|${body}`.match(new RegExp(`\\|\\s*${key}\\s*=\\s*([^|\\n]*)`, "i"))?.[1]?.trim() || null;
const clean = (s) => s?.replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1").replace(/'{2,}/g, "").replace(/<[^>]+>/g, "").trim() || null;

// food / shop kinds from the listing's name and description (English keywords)
const EAT_KINDS = [
  ["ramen", /ramen|tsukemen|noodle shop/i], ["sushi", /sushi|sashimi|kaiten/i], ["udon_soba", /udon|soba/i],
  ["yakiniku", /yakiniku|bbq|barbecue|wagyu|beef|steak|kobe beef/i], ["tempura_tonkatsu", /tempura|tonkatsu|katsu/i],
  ["okonomiyaki", /okonomiyaki|takoyaki|monja|kushikatsu/i], ["izakaya", /izakaya|yakitori|pub|sake/i],
  ["seafood", /seafood|crab|kani|oyster|fish market|uni|kaisen/i], ["cafe_sweets", /cafe|café|coffee|dessert|sweets|cake|bakery|parfait|matcha|wagashi|ice cream/i],
  ["kaiseki", /kaiseki|ryotei|tofu|shojin|vegetarian/i], ["curry", /curry/i], ["cheap", /cheap|budget|chain|food court|depachika/i],
];
const BUY_KINDS = [
  ["souvenir", /souvenir|omiyage|gift|craft|traditional|handicraft|ceramic|pottery|lacquer|textile|kimono/i],
  ["department", /department store|mall|shopping (?:centre|center)|depachika|outlet/i],
  ["market", /market|ichiba|shotengai|arcade|street/i], ["electronics", /electronic|camera|anime|manga|game|figure|otaku/i],
  ["drugstore", /drugstore|drug store|pharmacy|cosmetic|don quijote|donki/i], ["food_gift", /snack|sweets|tea|sake|food|wagashi|confection/i],
];
const SLEEP_KINDS = [
  ["ryokan", /ryokan|minshuku|onsen|hot spring|tatami|kaiseki/i],
  ["hostel", /hostel|capsule|guest ?house|dorm|backpacker/i],
  ["business", /business hotel|toyoko|dormy inn|apa hotel|route[- ]inn|super hotel|comfort hotel/i],
];
const kinds = (kind, text) => (kind === "eat" ? EAT_KINDS : kind === "buy" ? BUY_KINDS : SLEEP_KINDS).filter(([, re]) => re.test(text)).map(([k]) => k);

function listings(text, district) {
  const out = [];
  // {{eat|…}} {{buy|…}} {{sleep|…}} and the generic {{listing|type=eat|…}}
  for (const m of text.matchAll(/\{\{\s*(eat|buy|drink|sleep|listing)\s*\|([\s\S]*?)\}\}/gi)) {
    let kind = m[1].toLowerCase();
    if (kind === "listing") kind = (field(m[2], "type") ?? "").toLowerCase();
    if (kind === "drink") kind = "eat";
    if (kind !== "eat" && kind !== "buy" && kind !== "sleep") continue;
    const name = clean(field(m[2], "name"));
    if (!name || name.length > 80) continue;
    const alt = clean(field(m[2], "alt"));
    const content = clean(field(m[2], "content")) ?? "";
    const la = Number(field(m[2], "lat")), lo = Number(field(m[2], "long"));
    const price = clean(field(m[2], "price"));
    const figures = price ? [...price.replace(/,/g, "").matchAll(/(\d{3,6})/g)].map((x) => Number(x[1])) : [];
    // food: the dearer figure; a stay: the "from" price (guides add weekly rates and suites after it)
    const yen = kind === "sleep" ? Math.min(...figures.filter((y) => y >= 1000), Infinity) : Math.max(...figures, 0);
    out.push({
      n: name,
      ...(alt && /[\u3040-\u30ff\u4e00-\u9fff]/.test(alt) ? { a: alt } : {}),
      k: kind,
      ...(district ? { d: district } : {}),
      ...(Number.isFinite(la) && la && Number.isFinite(lo) && lo ? { la: Math.round(la * 1e4) / 1e4, lo: Math.round(lo * 1e4) / 1e4 } : {}),
      // price band (only when the guide gives a yen figure): food 1 under ¥1,500 · 2 under ¥5,000 · 3 above;
      // a night's stay from 1 under ¥8,000 · 2 under ¥20,000 · 3 above
      ...(yen && yen !== Infinity ? { p: kind === "sleep" ? (yen < 8000 ? 1 : yen < 20000 ? 2 : 3) : yen < 1500 ? 1 : yen < 5000 ? 2 : 3 } : {}),
      t: kinds(kind, `${name} ${content}`),
    });
  }
  return out;
}

const result = {};
for (const city of CITIES) {
  const title = WV_TITLE[city] ?? city;
  const main = await wikitext(title);
  if (main == null) { console.log(`${city}: not downloaded (rate limit), run again`); continue; }
  const all = listings(main, null);
  // district articles: [[Tokyo/Shinjuku]] or [[Tokyo/Shinjuku|Shinjuku]]
  const districts = [...new Set([...main.matchAll(new RegExp(`\\[\\[(${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/[^\\]|#]+)`, "g"))].map((m) => m[1]))];
  for (const page of districts) {
    const text = await wikitext(page);
    if (text) all.push(...listings(text, page.slice(title.length + 1)));
  }
  const seen = new Set();
  result[city] = all.filter((l) => { const key = `${l.k}|${l.n.toLowerCase()}`; if (seen.has(key)) return false; seen.add(key); return true; });
  const count = (k) => result[city].filter((l) => l.k === k).length;
  console.log(`${city}: ${count("eat")} eat · ${count("buy")} buy · ${count("sleep")} sleep${districts.length ? ` (${districts.length} districts)` : ""}`);
}
writeFileSync(OUT, JSON.stringify(result) + "\n");
const total = Object.values(result).flat().length;
console.log(`\n${total} listings in ${Object.keys(result).length} cities`);
