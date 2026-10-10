// Jev reads each source page and judges, month by month, whether the place is open.
// Output: data/places/closure-check.json — a proposal that a human/Claude reviews
// against the quoted evidence before seasonal-closures.json is marked verified.
//
// Run: node --env-file=.env.local scripts/verify-closures.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { askSystemOne } from "../lib/tabi/system-one.ts";

const CHECKS = [
  { match: "Tateyama|Mount Tate|Kurobe|Murodō", url: "https://www.alpen-route.com/en/", place: "Tateyama Kurobe Alpine Route" },
  { match: "Kamikōchi|Kamikochi", url: "https://www.japan-guide.com/e/e6040.html", place: "Kamikochi" },
  { match: "Shiretoko Five Lakes|Shiretoko Goko", url: "https://www.goko.go.jp/multilingual_eng/access.html", place: "Shiretoko Goko Lakes" },
];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// Dates appear as prose ("open from April 17"), dotted ("2026.4.15 - 11.30") or table
// cells ("4/20", "11/1 - 11/8"); the first run missed the last two and fed Jev menus.
const SIGNAL = /(period of operation|opening period|open(s|ing)? from|shuts? down|clos(e|ed|es)\b|\d{4}\.\d{1,2}\.\d{1,2}|\b\d{1,2}\/\d{1,2}\b)/gi;

function pageText(html) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

/** Text windows around date/season signals — what Jev reads and what the reviewer checks. */
function evidence(text) {
  const spans = [];
  for (const m of text.matchAll(SIGNAL)) {
    const start = Math.max(0, m.index - 160), end = Math.min(text.length, m.index + 200);
    const last = spans[spans.length - 1];
    if (last && start <= last[1]) last[1] = end; else spans.push([start, end]);
  }
  return spans.map(([a, b]) => text.slice(a, b).trim()).join(" … ");
}

const out = [];
for (const c of CHECKS) {
  const res = await fetch(c.url, { headers: { "User-Agent": "nagame-closure-check/0.1" } });
  if (!res.ok) { out.push({ ...c, error: `HTTP ${res.status}` }); continue; }
  const ev = evidence(pageText(await res.text())).slice(0, 4000);
  const questions = {
    states_season: { type: "noul", instructions: `Does \`page\` state when ${c.place} is open or closed to visitors during the year?` },
    ...Object.fromEntries(MONTHS.map((m, i) => [`open_${i + 1}`, {
      type: "noul",
      instructions: `According to \`page\`, can visitors access ${c.place} for most of ${m}? Answer about the whole route/area, not a single facility.`,
    }])),
  };
  const a = await askSystemOne({ place: c.place, page: ev }, questions, { timeoutMs: 15000 });
  const openProb = MONTHS.map((_, i) => Number(a[`open_${i + 1}`].noul.toFixed(2)));
  out.push({
    match: c.match, place: c.place, url: c.url,
    statesSeason: Number(a.states_season.noul.toFixed(2)),
    jevClosedMonths: openProb.map((p, i) => (p < 0.5 ? i + 1 : null)).filter(Boolean),
    jevUncertainMonths: openProb.map((p, i) => (p >= 0.3 && p <= 0.7 ? i + 1 : null)).filter(Boolean),
    openProbability: openProb,
    evidence: ev.slice(0, 1200),
  });
}

writeFileSync(new URL("../data/places/closure-check.json", import.meta.url), JSON.stringify({ checkedAt: new Date().toISOString(), results: out }, null, 2));
const current = JSON.parse(readFileSync(new URL("../data/places/seasonal-closures.json", import.meta.url), "utf8"));
for (const r of out) {
  const now = current.closures.find((x) => x.match === r.match);
  console.log(`\n${r.place}  (${r.url})`);
  if (r.error) { console.log("  ERROR", r.error); continue; }
  console.log(`  page states season: ${r.statesSeason}`);
  console.log(`  Jev closed months : ${JSON.stringify(r.jevClosedMonths)}   current file: ${JSON.stringify(now?.closedMonths)}`);
  console.log(`  uncertain months  : ${JSON.stringify(r.jevUncertainMonths)}`);
  console.log(`  open p by month   : ${r.openProbability.join(" ")}`);
  console.log(`  evidence          : ${r.evidence.slice(0, 300)}`);
}
