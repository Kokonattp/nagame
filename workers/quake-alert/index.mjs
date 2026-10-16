// Nagame quake alerts worker: sends Thai Web Push to travellers whose trip is in a warned area.
// Sources: P2PQuake WebSocket (relay of 気象庁, seconds) + 気象庁 XML feed polled every 30 s (official,
// backup if P2PQuake is down) + 気象庁 weather 警報 polled every 5 min. Must run 24/7 — see README.md.
//
//   node index.mjs                     live, sends pushes (needs env below)
//   node index.mjs --dry               live, prints instead of sending
//   node index.mjs --sandbox --dry     P2PQuake sandbox (replays 2023 bulletins every ~30 s)
//   node index.mjs --replay fixtures/eew-2026-10-16.json --subs subs.json   offline replay, prints
//
// env: SUPABASE_URL, SUPABASE_SERVICE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…)

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { FEED_URL, WARNING_URL, feedEntries, recordFromXml, warningsByArea } from "./jma.mjs";
import { activePhones, jst, newMemory, plan, planWeather } from "./rules.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const DRY = flag("--dry") || flag("--replay");
const WS_URL = flag("--sandbox") ? "wss://api-realtime-sandbox.p2pquake.net/v2/ws" : (process.env.P2PQUAKE_WS ?? "wss://api.p2pquake.net/v2/ws");
const HISTORY = "https://api.p2pquake.net/v2/history?codes=551&codes=552&codes=556&limit=20";
const CODES = new Set([551, 552, 556]);
const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
// new Supabase secret keys (sb_secret_…) go in `apikey` only; legacy service_role JWTs also as Bearer
const DB_HEADERS = { apikey: SUPABASE_SERVICE_KEY, ...(SUPABASE_SERVICE_KEY?.startsWith("eyJ") ? { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } : {}) };

const log = (...a) => console.log(new Date().toISOString(), ...a);
const mem = newMemory();

// ── subscriptions: cached and refreshed every 30 s so an EEW never waits on the database ──
let subs = [];
const subsFile = opt("--subs");
async function refreshSubs() {
  if (subsFile) { subs = JSON.parse(readFileSync(subsFile, "utf8")); return; }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  const day = (n) => new Date(Date.now() + 9 * 3_600_000 + n * 86_400_000).toISOString().slice(0, 10);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=endpoint,p256dh,auth,prefectures,jma,starts_on,ends_on&starts_on=lte.${day(1)}&ends_on=gte.${day(-1)}`, {
      headers: DB_HEADERS,
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) subs = await res.json();
    else log("subs: HTTP", res.status);
  } catch (e) { log("subs:", e.message); /* keep the last good list */ }
}
async function dropSub(endpoint) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
    method: "DELETE", headers: DB_HEADERS,
  }).catch(() => {});
}
async function dropFinishedTrips() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?ends_on=lt.${weekAgo}`, {
    method: "DELETE", headers: DB_HEADERS,
  }).catch(() => {});
}

// ── sending ──
let webpush = null;
async function sender() {
  if (DRY) return null;
  if (webpush) return webpush;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY missing (or run with --dry)");
  webpush = (await import("web-push")).default;
  webpush.setVapidDetails(VAPID_SUBJECT ?? "mailto:admin@example.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return webpush;
}

async function deliver(sends, receivedAt) {
  const wp = await sender();
  let ok = 0;
  const queue = [...sends];
  const worker = async () => {
    for (let s = queue.shift(); s; s = queue.shift()) {
      const { sub, payload } = s;
      if (!wp) { console.log(`  → ${sub.endpoint.slice(0, 48)}…\n    ${payload.title}\n    ${payload.body.replace(/\n/g, "\n    ")}`); ok++; continue; }
      try {
        await wp.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { TTL: payload.ttl, urgency: payload.urgent ? "high" : "normal", timeout: 10_000 },
        );
        ok++;
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) dropSub(sub.endpoint); // unsubscribed / expired
        else log("push failed", e.statusCode ?? "", e.message);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(50, sends.length) }, worker));
  log(`sent ${ok}/${sends.length} in ${Date.now() - receivedAt} ms`);
}

// ── P2PQuake records ──
const seen = new Map(); // record id → time seen (the WS may repeat a record; history overlaps it)
async function handle(rec, now = Date.now()) {
  const id = rec.id ?? rec._id; // /history says "id", the WebSocket says "_id"
  if (!CODES.has(rec.code) || !id || seen.has(id)) return;
  seen.set(id, Date.now());
  const sends = plan(rec, subs, mem, now);
  log(`code ${rec.code} ${rec.time}${rec.cancelled ? " (cancelled)" : ""} → ${sends.length} push`);
  if (sends.length) await deliver(sends, Date.now());
}

/** After a reconnect: catch up on anything issued while we were away (rules skip what is too old). */
async function backfill() {
  try {
    const res = await fetch(HISTORY, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return;
    const recs = (await res.json()).reverse();
    for (const r of recs) await handle(r);
  } catch (e) { log("backfill:", e.message); }
}

// ── 気象庁 XML feed: official second source for quake info and tsunami (EEW is not in it) ──
const jmaSeen = new Set();
let feedModified = "";
async function pollJmaFeed() {
  try {
    const res = await fetch(FEED_URL, { headers: feedModified ? { "If-Modified-Since": feedModified } : {}, signal: AbortSignal.timeout(15_000) });
    if (res.status === 304 || !res.ok) return;
    feedModified = res.headers.get("last-modified") ?? "";
    for (const e of feedEntries(await res.text()).reverse()) {
      if (jmaSeen.has(e.url)) continue;
      jmaSeen.add(e.url);
      if (Date.now() - Date.parse(e.updated) > 30 * 60_000) continue; // rules would skip it anyway; save the fetch
      const xml = await fetch(e.url, { signal: AbortSignal.timeout(15_000) }).then((r) => (r.ok ? r.text() : "")).catch(() => "");
      const rec = xml && recordFromXml(xml, e.url);
      if (rec) await handle(rec);
    }
  } catch (err) { log("jma feed:", err.message); }
}

// ── weather 警報: only the forecast offices someone on a trip needs ──
const STATE_FILE = new URL("./.weather-state.json", import.meta.url);
function loadWeatherState() {
  try {
    if (existsSync(STATE_FILE)) mem.weather = new Map(Object.entries(JSON.parse(readFileSync(STATE_FILE, "utf8"))).map(([k, v]) => [k, new Map(v)]));
  } catch { /* start fresh */ }
}
function saveWeatherState() {
  try { writeFileSync(STATE_FILE, JSON.stringify(Object.fromEntries([...mem.weather].map(([k, v]) => [k, [...v]])))); } catch (e) { log("weather state:", e.message); }
}
async function pollWeather() {
  const offices = [...new Set(activePhones(subs, Date.now()).flatMap((s) => (s.jma ?? []).map((w) => w.office)))];
  if (!offices.length) return;
  const byOffice = new Map();
  await Promise.all(offices.map(async (office) => {
    try {
      const res = await fetch(WARNING_URL(office), { signal: AbortSignal.timeout(15_000) });
      if (res.ok) byOffice.set(office, warningsByArea(await res.json()));
    } catch { /* office unreachable → its towns keep their last state */ }
  }));
  const sends = planWeather(byOffice, subs, mem);
  saveWeatherState();
  log(`weather: ${byOffice.size}/${offices.length} offices → ${sends.length} push`);
  if (sends.length) await deliver(sends, Date.now());
}

function connect(attempt = 0) {
  const ws = new WebSocket(WS_URL);
  ws.onopen = () => { log("connected", WS_URL); attempt = 0; backfill(); };
  ws.onmessage = (ev) => {
    let rec;
    try { rec = JSON.parse(ev.data); } catch { return; }
    handle(rec).catch((e) => log("handle:", e.message));
  };
  ws.onclose = () => {
    const wait = Math.min(30_000, 1000 * 2 ** attempt);
    log(`disconnected, retry in ${wait} ms`);
    setTimeout(() => connect(attempt + 1), wait);
  };
  ws.onerror = () => {}; // onclose follows
}

if (opt("--replay")) {
  await refreshSubs();
  const recs = JSON.parse(readFileSync(opt("--replay"), "utf8")).sort((a, b) => (a.time < b.time ? -1 : 1));
  for (const r of recs) await handle(r, jst(r.time));
} else {
  await refreshSubs();
  setInterval(refreshSubs, 30_000);
  setInterval(() => {
    const cutoff = Date.now() - 3_600_000;
    for (const [id, t] of seen) if (t < cutoff) seen.delete(id);
    if (seen.size === 0) { const fresh = newMemory(); mem.eew = fresh.eew; mem.quake = fresh.quake; mem.tsunami = fresh.tsunami; } // quiet hour: forget quake state (weather state is kept)
    log(`alive, ${subs.length} active subscriptions`);
  }, 3_600_000);
  dropFinishedTrips();
  setInterval(dropFinishedTrips, 24 * 3_600_000);
  if (!DRY) await sender(); // fail fast on missing keys, not at the first earthquake
  loadWeatherState();
  connect();
  pollJmaFeed();
  setInterval(pollJmaFeed, 30_000);
  pollWeather();
  setInterval(pollWeather, 5 * 60_000);
}
