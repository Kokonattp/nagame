// Flight price snapshots for Tabi, collected on the owner's PC (Vercel cannot run Chrome).
//
// Opens a normal Chrome (own profile, remote debugging — the same way Jev ultrafast drives it),
// reads Google Flights result pages for Bangkok → each gateway, one round trip per month, and
// writes data/flights/snapshot.json. The site shows these as "prices Tabi checked on <date>",
// always next to the live Google Flights link.
//
// Search only: no login, no booking, no personal data. Nothing is faked to look human; if Google
// shows a block or CAPTCHA, the run stops at once and the previous snapshot stays.
//
// Run (PowerShell):  node workers/flight-prices/collect.mjs [--months=6] [--gap=20]
// Chrome must be closed first if it uses the same profile (a separate profile is used by default).

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PROFILE = process.env.FLIGHT_CHROME_PROFILE ?? "D:/TT/nagame-workers/chrome-cdp-profile";
const PORT = Number(process.env.FLIGHT_CDP_PORT ?? 9223);
const arg = (name, dflt) => Number(process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? dflt);
const MONTHS = arg("months", 6);
const GAP_MS = arg("gap", 20) * 1000; // pause between searches: a person's pace, not a crawler's
const OUT = new URL("../../data/flights/snapshot.json", import.meta.url);
// --gateways=OKA,CTS re-collects only those and keeps the other rows of the current snapshot
const ONLY = process.argv.find((a) => a.startsWith("--gateways="))?.split("=")[1]?.split(",");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// gateway codes as the planner uses them (lib/tabi/cities.ts GATEWAYS)
const GATEWAYS = [
  { code: "TYO", search: "Tokyo" }, { code: "OSA", search: "Osaka" }, { code: "NGO", search: "Nagoya" },
  { code: "FUK", search: "Fukuoka" }, { code: "CTS", search: "Sapporo" }, { code: "OKA", search: "Okinawa" },
];

/** Sample trip per month: depart the 10th, back the 15th (5 days), starting next month when the 10th has passed. */
function sampleTrips(now = new Date()) {
  const trips = [];
  let y = now.getFullYear();
  let m = now.getMonth() + (now.getDate() >= 3 ? 1 : 0); // keep at least a week of lead time
  for (let i = 0; i < MONTHS; i++, m++) {
    const d = new Date(Date.UTC(y, m, 10));
    const r = new Date(Date.UTC(y, m, 15));
    trips.push({ month: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`, depart: d.toISOString().slice(0, 10), back: r.toISOString().slice(0, 10) });
  }
  return trips;
}

const BLOCKED = /unusual traffic|captcha|are you a robot|not a robot|something went wrong|อ๊ะ มีบางอย่างผิดพลาด/i;

/** Flights listed on the results page: price, airline, nonstop?, duration, airports. */
export function parseResults(raw) {
  // Google uses no-break / narrow no-break spaces inside prices, times and durations
  const text = raw.replace(/[   ]/g, " ");
  const start = text.indexOf("Top departing flights");
  if (start < 0) return { cheapest: null, flights: [] };
  const cheapest = Number((text.match(/Cheapest\s*\n?\s*from\s*\n?[^\n]*?\n?\s*THB ([\d,]+)/) ?? [])[1]?.replace(/,/g, "")) || null;
  const flights = [];
  for (const block of text.slice(start).split(/\n\s*round trip\s*\n/)) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const priceLine = [...lines].reverse().find((l) => /^THB [\d,]+$/.test(l));
    const durIdx = lines.findIndex((l) => /^\d+ hr( \d+ min)?$/.test(l));
    const route = lines.find((l) => /^[A-Z]{3}–[A-Z]{3}$/.test(l));
    const stops = lines.find((l) => /^(Nonstop|\d+ stops?)$/.test(l));
    if (!priceLine || durIdx < 1 || !route || !stops) continue;
    flights.push({
      price: Number(priceLine.slice(4).replace(/,/g, "")),
      airline: lines[durIdx - 1].replace(/Operated by (.+)$/, " (บินโดย $1)"),
      duration: lines[durIdx],
      route,
      nonstop: stops === "Nonstop",
    });
  }
  return { cheapest: cheapest ?? (flights.length ? Math.min(...flights.map((f) => f.price)) : null), flights };
}

async function openChrome() {
  mkdirSync(PROFILE, { recursive: true });
  const proc = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, "--no-first-run", "about:blank"], { stdio: "ignore", detached: false });
  for (let i = 0; i < 40; i++) {
    try {
      const v = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
      return { proc, browser: await puppeteer.connect({ browserWSEndpoint: v.webSocketDebuggerUrl, defaultViewport: null }) };
    } catch { await sleep(500); }
  }
  proc.kill();
  throw new Error("Chrome did not open its debugging port");
}

async function main() {
  const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : null;
  const { proc, browser } = await openChrome();
  let page = await browser.newPage();
  const routes = [];
  let stoppedBy = null;
  try {
    outer: for (const g of GATEWAYS.filter((x) => !ONLY || ONLY.includes(x.code))) {
      for (const t of sampleTrips()) {
        const q = `Flights to ${g.search} from Bangkok on ${t.depart} through ${t.back}`;
        const url = `https://www.google.com/travel/flights?hl=en&curr=THB&q=${encodeURIComponent(q)}`;
        try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
        await sleep(12000); // results stream in
        // the page names its own dates ("…departing 2027-04-05…"): only then do the prices belong to this trip
        let text = await page.evaluate(() => document.body.innerText);
        if (!text.includes(t.depart) && !BLOCKED.test(text)) { await sleep(6000); text = await page.evaluate(() => document.body.innerText); }
        if (BLOCKED.test(text)) { stoppedBy = `blocked at ${g.code} ${t.month}`; break outer; }
        if (!text.includes(t.depart)) { console.log(`${g.code} ${t.month}: page did not confirm the dates, skipped`); await sleep(GAP_MS); continue; }
        const { cheapest, flights } = parseResults(text);
        const nonstop = flights.filter((f) => f.nonstop).sort((a, b) => a.price - b.price)[0] ?? null;
        routes.push({ gateway: g.code, month: t.month, depart: t.depart, back: t.back, cheapest, nonstop, results: flights.length });
        console.log(`${g.code} ${t.month}: cheapest ${cheapest ?? "-"} THB · nonstop ${nonstop ? `${nonstop.price} ${nonstop.airline}` : "-"}`);
        } catch (err) {
          // e.g. the tab was replaced mid-read ("detached frame"): skip this one trip, carry on in a fresh tab
          console.log(`${g.code} ${t.month}: skipped (${String(err.message).slice(0, 60)})`);
          page = await browser.newPage();
        }
        await sleep(GAP_MS);
      }
    }
  } finally {
    await browser.close().catch(() => {});
    proc.kill();
  }
  if (stoppedBy || !routes.length) {
    console.error(`stopped (${stoppedBy ?? "no results"}); keeping the previous snapshot${previous ? ` from ${previous.checkedAt}` : ""}`);
    process.exit(2);
  }
  // partial re-run: keep the other gateways' rows from the current snapshot
  const kept = ONLY && previous ? previous.routes.filter((r) => !ONLY.includes(r.gateway)) : [];
  mkdirSync(new URL(".", OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ checkedAt: new Date().toISOString(), source: "Google Flights (economy, 1 adult, round trip)", currency: "THB", routes: [...kept, ...routes] }, null, 2) + "\n");
  console.log(`wrote ${routes.length} routes → data/flights/snapshot.json`);
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("collect.mjs")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
