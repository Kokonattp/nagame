// Nagame quake alerts worker: listens to P2PQuake (relay of 気象庁 bulletins) and sends Thai Web Push
// to travellers whose trip is in a warned prefecture. Must run 24/7 on one machine — see README.md.
//
//   node index.mjs                     live, sends pushes (needs env below)
//   node index.mjs --dry               live, prints instead of sending
//   node index.mjs --sandbox --dry     P2PQuake sandbox (replays 2023 bulletins every ~30 s)
//   node index.mjs --replay fixtures/eew-2026-10-16.json --subs subs.json   offline replay, prints
//
// env: SUPABASE_URL, SUPABASE_SERVICE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…)

import { readFileSync } from "node:fs";
import { jst, newMemory, plan } from "./rules.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const DRY = flag("--dry") || flag("--replay");
const WS_URL = flag("--sandbox") ? "wss://api-realtime-sandbox.p2pquake.net/v2/ws" : (process.env.P2PQUAKE_WS ?? "wss://api.p2pquake.net/v2/ws");
const HISTORY = "https://api.p2pquake.net/v2/history?codes=551&codes=552&codes=556&limit=20";
const CODES = new Set([551, 552, 556]);
const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

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
    const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=endpoint,p256dh,auth,prefectures,starts_on,ends_on&starts_on=lte.${day(1)}&ends_on=gte.${day(-1)}`, {
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) subs = await res.json();
    else log("subs: HTTP", res.status);
  } catch (e) { log("subs:", e.message); /* keep the last good list */ }
}
async function dropSub(endpoint) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
    method: "DELETE", headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
  }).catch(() => {});
}
async function dropFinishedTrips() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?ends_on=lt.${weekAgo}`, {
    method: "DELETE", headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
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
    if (seen.size === 0) Object.assign(mem, newMemory()); // quiet for an hour: forget who was told
    log(`alive, ${subs.length} active subscriptions`);
  }, 3_600_000);
  dropFinishedTrips();
  setInterval(dropFinishedTrips, 24 * 3_600_000);
  if (!DRY) await sender(); // fail fast on missing keys, not at the first earthquake
  connect();
}
