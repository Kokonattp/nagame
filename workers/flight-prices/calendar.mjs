// Cheapest-dates calendar for Tabi ("ไป ม.ค. 5 วัน ช่วงไหนถูก"), collected on the owner's PC.
//
// Google Flights' "Price graph" lists the round-trip price for every departure date (~60 days per
// view) at a fixed trip length. This opens one results page per gateway, opens the graph, reads each
// bar (hover → "Sat, Jan 23 - Wed, Jan 27 · From THB 14,516"), scrolls forward for ~10 months, then
// switches the trip length with the page's own "Extend your stay" button. Same rules as collect.mjs:
// normal Chrome, nothing faked, stop on any block or CAPTCHA, keep the previous file.
//
// Run (PowerShell):  node workers/flight-prices/calendar.mjs [--gateways=OSA,TYO]
// Output: data/flights/calendar.json (read on the server only; the client gets 3 dates per answer)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { BLOCKED, GATEWAYS, openChrome } from "./collect.mjs";

const OUT = new URL("../../data/flights/calendar.json", import.meta.url);
const ONLY = process.argv.find((a) => a.startsWith("--gateways="))?.split("=")[1]?.split(",");
/** Tabi trip lengths in days (Google counts nights: a 5-day trip is its "4-day trip"). */
const LENGTHS = [4, 5, 6, 7, 10];
const WINDOWS = 10; // a scroll moves ~a month: 10 views ≈ 10 months
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return iso(d); };

const dialogText = (page) => page.evaluate(() => [...document.querySelectorAll("[role=dialog]")].find((d) => d.innerText.includes("Price graph"))?.innerText ?? "");

async function clickByLabel(page, label) {
  return page.evaluate((label) => {
    const d = [...document.querySelectorAll("[role=dialog]")].find((x) => x.innerText.includes("Price graph")) ?? document;
    const b = [...d.querySelectorAll("button,[role=button]")].find((x) => (x.getAttribute("aria-label") || x.innerText || "").trim() === label);
    if (!b) return false;
    b.click();
    return true;
  }, label);
}

/** Price shown in the tooltip after hovering `bar`, only if the tooltip names that bar's date. */
async function hoverPrice(page, bar, depart) {
  const box = await bar.boundingBox();
  if (!box) return null;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 4);
  await sleep(120);
  const text = (await dialogText(page)).replace(/[  ]/g, " ");
  const d = new Date(`${depart}T00:00:00Z`);
  const want = `${MON[d.getUTCMonth()]} ${d.getUTCDate()} - `;
  const m = [...text.matchAll(/[A-Z][a-z]{2}, ([A-Z][a-z]{2} \d{1,2}) - [A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}\s*From THB ([\d,]+)/g)].find((x) => `${x[1]} - ` === want);
  return m ? Number(m[2].replace(/,/g, "")) : null;
}

/**
 * Prices for every bar in the current view. Bar height is proportional to price (data-rect
 * "x,y,w,-h"), so 3 hovered bars give the scale and the rest are read from their height.
 * If the 3 samples disagree by more than 2 %, every bar is hovered instead (exact, slower).
 */
async function readBars(page, days, seen) {
  const bars = [];
  for (const bar of await page.$$("[role=dialog] path[data-id]")) {
    const [depart, rect] = await bar.evaluate((e) => [e.getAttribute("data-id"), e.getAttribute("data-rect")]);
    const h = Math.abs(Number(rect?.split(",")[3]));
    if (depart && !seen.has(depart) && h > 0) bars.push({ bar, depart, h });
  }
  if (!bars.length) return [];
  const byH = [...bars].sort((a, b) => a.h - b.h);
  const samples = [byH[0], byH[Math.floor(byH.length / 2)], byH[byH.length - 1]];
  const ratios = [];
  const exact = new Map();
  for (const s of samples) {
    const price = await hoverPrice(page, s.bar, s.depart);
    if (price) { ratios.push(price / s.h); exact.set(s.depart, price); }
  }
  const k = ratios.reduce((a, b) => a + b, 0) / (ratios.length || 1);
  const consistent = ratios.length === 3 && ratios.every((r) => Math.abs(r - k) / k < 0.02);
  const rows = [];
  for (const b of bars) {
    let price = exact.get(b.depart) ?? null;
    if (price === null) price = consistent ? Math.round((b.h * k) / 10) * 10 : await hoverPrice(page, b.bar, b.depart);
    if (!price) continue;
    rows.push({ depart: b.depart, back: addDays(b.depart, days - 1), price, exact: exact.has(b.depart) || !consistent });
    seen.add(b.depart);
  }
  return rows;
}

async function main() {
  const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : null;
  const { proc, browser } = await openChrome();
  let page = await browser.newPage();
  const rows = [];
  let stoppedBy = null;
  const start = addDays(iso(new Date()), 10); // at least ~a week of lead time
  try {
    outer: for (const g of GATEWAYS.filter((x) => !ONLY || ONLY.includes(x.code))) {
      try {
        const q = `Flights to ${g.search} from Bangkok on ${start} through ${addDays(start, LENGTHS[0] - 1)}`;
        await page.goto(`https://www.google.com/travel/flights?hl=en&curr=THB&q=${encodeURIComponent(q)}`, { waitUntil: "domcontentloaded", timeout: 60000 });
        await sleep(12000);
        const body = await page.evaluate(() => document.body.innerText);
        if (BLOCKED.test(body)) { stoppedBy = `blocked at ${g.code}`; break outer; }
        if (!(await clickByLabel(page, "Price graph"))) { console.log(`${g.code}: no price graph, skipped`); continue; }
        await sleep(5000);
        let current = LENGTHS[0];
        for (const days of LENGTHS) {
          while (current < days) { await clickByLabel(page, "Extend your stay by one day"); current++; await sleep(4000); }
          if (!(await dialogText(page)).includes(`${days - 1}-day trip`)) { console.log(`${g.code} ${days}d: trip length not confirmed, skipped`); continue; }
          let got = 0;
          const seen = new Set();
          for (let w = 0; w < WINDOWS; w++) {
            const part = await readBars(page, days, seen);
            rows.push(...part.map((r) => ({ gateway: g.code, days, ...r })));
            got += part.length;
            if (w < WINDOWS - 1) { await clickByLabel(page, "Scroll forward"); await sleep(5000); }
            if (BLOCKED.test(await page.evaluate(() => document.body.innerText))) { stoppedBy = `blocked at ${g.code}`; break outer; }
          }
          // back to the first window for the next trip length
          for (let w = 0; w < WINDOWS - 1; w++) { await clickByLabel(page, "Scroll backward"); await sleep(2500); }
          console.log(`${g.code} ${days} วัน: ${got} departure dates`);
        }
      } catch (err) {
        console.log(`${g.code}: skipped (${String(err.message).slice(0, 60)})`);
        page = await browser.newPage();
      }
      await sleep(20000);
    }
  } finally {
    await browser.close().catch(() => {});
    proc.kill();
  }
  if (stoppedBy || !rows.length) {
    console.error(`stopped (${stoppedBy ?? "no results"}); keeping the previous calendar${previous ? ` from ${previous.checkedAt}` : ""}`);
    process.exit(2);
  }
  // de-duplicate (windows overlap) and keep other gateways on a partial run
  const seen = new Set();
  const fresh = rows.filter((r) => { const k = `${r.gateway}|${r.days}|${r.depart}`; if (seen.has(k)) return false; seen.add(k); return true; });
  const kept = ONLY && previous ? previous.rows.filter((r) => !ONLY.includes(r.gateway)) : [];
  mkdirSync(new URL(".", OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ checkedAt: new Date().toISOString(), source: "Google Flights price graph (economy, 1 adult, round trip)", currency: "THB", rows: [...kept, ...fresh] }) + "\n");
  console.log(`wrote ${fresh.length} dated prices → data/flights/calendar.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
