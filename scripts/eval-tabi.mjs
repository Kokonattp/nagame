// Tabi agent evaluation (spec M3): fixed Thai scenarios → measured behaviour.
// Metrics: action accuracy, slot accuracy (month/days/date), constraint checks,
// grounding (every suggested place exists in the place store), latency, Jev vs fallback.
//
// Run against a server:  BASE=http://localhost:3000 node scripts/eval-tabi.mjs
// Paced at ~11 req/min to stay under /api/tabi's 12/min per-IP limit.
// Writes docs/eval/tabi-eval.md + docs/eval/tabi-eval.json

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/$/, "");
const PACE_MS = Number(process.env.PACE_MS ?? 5500);
const places = JSON.parse(readFileSync(new URL("../data/places/places.json", import.meta.url), "utf8"));
const PLACE_IDS = new Set(places.map((p) => p.id));
const REGION_OF = Object.fromEntries(places.map((p) => [p.baseCity, p.region]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ids = (r) => (r.routes ?? []).map(({ id, title }) => ({ id, title }));
const stopsIn = (r) => (r.routes ?? []).flatMap((o) => o.stops.map((s) => s.city));
const regionsOf = (r) => new Set(stopsIn(r).map((c) => REGION_OF[c]).filter(Boolean));

// Each case: message, optional context builder (from earlier replies), expected action + checks.
const CASES = [
  { id: "discover-nature", msg: "อยากไปญี่ปุ่น 5 วันกลาง พ.ค. เน้นธรรมชาติ", action: "suggest_routes", month: 5, days: 5 },
  { id: "exact-date", msg: "ไป 10 ธ.ค. 5 วัน อยากเห็นหิมะ", action: "suggest_routes", month: 12, days: 5, date: "2026-12-10" },
  { id: "kyoto-autumn", msg: "อยากไปเกียวโต ดูใบไม้เปลี่ยนสี พ.ย. 5 วัน", action: "suggest_routes", month: 11, check: (r) => stopsIn(r).includes("Kyoto") },
  // every city the traveller names comes back together as the first option (Tokyo–Kyoto is ~370 km apart)
  { id: "golden-route", msg: "เที่ยวโตเกียว เกียวโต โอซาก้า 7 วัน เดือนพฤศจิกายน ชอบวัดและของกิน", action: "suggest_routes", month: 11, days: 7,
    check: (r) => ["Tokyo", "Kyoto", "Osaka"].every((c) => (r.routes?.[0]?.stops ?? []).some((s) => s.city === c)) },
  // smaller cities added 2026-10-12 (128 bases): asked-for towns must come back, and names must not collide
  { id: "small-city", msg: "อยากไปทตโตริ 3 วัน ดูเนินทราย", action: "suggest_routes", days: 3, check: (r) => stopsIn(r).includes("Tottori") },
  { id: "onsen-town", msg: "อยากแช่ออนเซ็นที่คิโนะซากิ 3 วัน เดือนมกรา", action: "suggest_routes", month: 1, check: (r) => stopsIn(r).includes("Kinosaki") },
  { id: "two-new-cities", msg: "เที่ยวฟุกุโอกะ นางาซากิ 5 วัน", action: "suggest_routes", days: 5, check: (r) => ["Fukuoka", "Nagasaki"].every((c) => (r.routes?.[0]?.stops ?? []).some((s) => s.city === c)) },
  { id: "nagoya-not-nago", msg: "trip to nagoya 4 days in march", action: "suggest_routes", check: (r) => !stopsIn(r).includes("Nago") },
  { id: "hokkaido-only", msg: "ฮอกไกโด ธันวาคม 7 วัน หิมะ ออนเซ็น", action: "suggest_routes", month: 12, days: 7, check: (r) => [...regionsOf(r)].every((g) => g === "hokkaido") },
  { id: "family-first", msg: "พาลูกไปญี่ปุ่นครั้งแรก เมษา 6 วัน", action: "suggest_routes", month: 4, days: 6 },
  { id: "tateyama", msg: "อยากไปทาเตยามะ ดูกำแพงหิมะ พ.ค.", action: "suggest_routes", month: 5, check: (r) => stopsIn(r).includes("Toyama") },
  { id: "two-weeks", msg: "เที่ยว 2 สัปดาห์ ช่วง พ.ย.", action: "suggest_routes", month: 11, days: 14 },
  { id: "no-false-month", msg: "พาเด็กคนเล็กไปด้วย 5 วัน", month: null, days: 5 },
  { id: "fukuoka-food", msg: "ไปฟุกุโอกะ 4 วัน กินราเมน", action: "suggest_routes", days: 4, check: (r) => [...regionsOf(r)].every((g) => g === "kyushu") },
  { id: "okinawa", msg: "โอกินาว่า มิถุนา 5 วัน", action: "suggest_routes", month: 6, check: (r) => [...regionsOf(r)].every((g) => g === "okinawa") },
  { id: "vague", msg: "อยากไปญี่ปุ่น", action: "ask" },
  { id: "greeting", msg: "สวัสดีทาบิ", action: "chat" },
  { id: "booking-refused", msg: "ช่วยจองโรงแรมให้หน่อย", action: "answer", check: (r) => r.bubbles.join(" ").includes("จองหรือจ่ายเงินให้ไม่ได้") },
  // where to stay: guide listings + Google Hotels, never a booking
  { id: "stay-city", msg: "แนะนำที่พักเกียวโตหน่อย", action: "answer", check: (r) => r.links?.some((l) => l.url.includes("google.com/travel/hotels")) && r.links.length > 1 },
  { id: "stay-ryokan", msg: "เรียวกังที่ฮาโกเนะดีๆ", action: "answer", check: (r) => r.links?.some((l) => l.url.includes("ryokan")) },
  { id: "stay-cheap", msg: "ที่พักถูกๆแถวชินจูกุ", action: "answer", check: (r) => r.links?.filter((l) => l.url.includes("/maps/")).every((l) => l.label.includes("ราคาประหยัด")) },
  // sights: a list, unless a trip length is given; spellings people actually type
  { id: "sights-city", msg: "ที่เที่ยวเกียวโตมีอะไรบ้าง", action: "answer", check: (r) => r.links?.length >= 4 && r.links.some((l) => /Kiyomizu|Fushimi|Kinkaku/.test(decodeURIComponent(l.url))) },
  { id: "sights-region", msg: "ฮอกไกโดมีที่เที่ยวอะไรบ้าง", action: "answer", check: (r) => r.links?.length >= 4 },
  { id: "sights-with-days", msg: "เที่ยวเกียวโต 5 วัน ไปไหนดี", action: "suggest_routes", days: 5, check: (r) => stopsIn(r).includes("Kyoto") },
  { id: "shop-spelling", msg: "แหล่งช็อปปิ้งโอซาก้า", action: "answer", check: (r) => r.bubbles[0].includes("ช้อปปิ้ง") && !r.intent.focus.includes("Saga") },
  { id: "city-spelling", msg: "ของฝากคานาซาวะ", action: "answer", check: (r) => r.intent.focus.includes("Kanazawa") },
  { id: "island-zamami", msg: "ไปเกาะซามามิ 3 วัน", action: "suggest_routes", days: 3, check: (r) => stopsIn(r).includes("Zamami") },
  { id: "stay-tip-airport", msg: "ที่พักเกาะมิยาโกะ", action: "answer", check: (r) => !r.bubbles.join(" ").includes("รถไฟ") },
  { id: "nagoya-spelling", msg: "อิเสะ นาโงย่า 3 วัน", action: "suggest_routes", check: (r) => ["Nagoya", "Ise"].every((c) => stopsIn(r).includes(c)) },
  { id: "place-thai-spelling", msg: "คินคาคุจิคนเยอะไหม", action: "answer", check: (r) => r.bubbles.join(" ").includes("Kinkaku") },
  // "คิโนะซากิออนเซ็น" contains "กิออน" (Gion, Kyoto): the city wins over a district hidden in its name
  { id: "district-in-name", msg: "ที่พักแถวคิโนะซากิออนเซ็น", action: "answer", check: (r) => !r.bubbles.join(" ").includes("เกียวโต") },
  { id: "food-no-guide", msg: "ร้านอาหารแถวคิโนะซากิออนเซ็น", action: "answer", check: (r) => r.links?.some((l) => l.url.includes("google.com/maps")) },
  { id: "stay-no-guide", msg: "ที่พักที่คิโนะซากิ", action: "answer", check: (r) => r.links?.[0]?.url.includes("google.com/travel/hotels") },
  // weather and food answers come from data (normals / guide listings), never a canned reply
  { id: "weather-snow", msg: "ซัปโปโร ธ.ค. หิมะตกไหม", action: "answer", month: 12, check: (r) => /ซัปโปโร ธ\.ค\.: กลางวัน/.test(r.bubbles.join(" ")) && r.bubbles.join(" ").includes("หิมะ") },
  { id: "food-district", msg: "ร้านราเมนแถวชินจูกุแนะนำหน่อย", action: "answer", check: (r) => r.links?.some((l) => l.url.includes("google.com/maps")) && !r.bubbles.join(" ").includes("จอง") },
  { id: "off-topic-honest", msg: "ใครชนะฟุตบอลเมื่อคืน", action: "chat", check: (r) => r.bubbles.join(" ").includes("ตอบไม่ได้") && !r.bubbles.join(" ").includes("จอง") },
  // a price may appear only as one Tabi checked itself, with the check date (workers/flight-prices)
  { id: "flight", msg: "ตั๋วไปโอซาก้าเดือนหน้าเท่าไร", action: "flights", check: (r) => { const t = r.bubbles.join(" "); return !/฿\s?\d|\d[\d,]*\s*บาท/.test(t) || /ทาบิเช็กไว้เมื่อ/.test(t); } },
  // multi-turn chain built on "discover-nature"
  { id: "refine-crowds", after: "discover-nature", msg: "มีแบบคนน้อยกว่านี้ไหม", ctx: (p) => ({ intent: p.intent, shownRoutes: ids(p) }), action: "suggest_routes", month: 5, days: 5,
    check: (r, p) => [...regionsOf(r)].some((g) => regionsOf(p).has(g)) },
  { id: "pick-first", after: "refine-crowds", msg: "อันแรกเลย", ctx: (p) => ({ intent: p.intent, shownRoutes: ids(p) }), action: "open_route", check: (r, p) => r.openRouteId === p.routes[0].id },
  { id: "draft", after: "refine-crowds", msg: "จัดเป็นแผนรายวันให้หน่อย", ctx: (p) => ({ intent: p.intent, selectedRoute: p.routes[0] }), action: "draft_itinerary", check: (r) => r.itinerary?.length === 5 },
  { id: "detail", msg: "Mount Fuji คนเยอะไหม", action: "answer", check: (r) => r.bubbles.join(" ").includes("Mount Fuji") },
  // practical questions: checked answers, never invented (lib/tabi/faq.ts)
  { id: "faq-visa", msg: "คนไทยไปญี่ปุ่นต้องขอวีซ่าไหม", action: "answer", check: (r) => r.bubbles.join(" ").includes("15 วัน") && r.links?.some((l) => l.url.includes("mofa.go.jp")) },
  { id: "faq-sim", msg: "ซื้อซิมหรือ esim ที่ไหนดี", action: "answer", check: (r) => r.bubbles.join(" ").includes("eSIM") },
  { id: "faq-plug", msg: "ปลั๊กไฟญี่ปุ่นใช้แบบไหน ต้องพกหัวแปลงไหม", action: "answer", check: (r) => r.bubbles.join(" ").includes("Type A") },
  { id: "faq-emergency", msg: "ถ้าป่วยหรือเกิดเหตุฉุกเฉินต้องโทรเบอร์อะไร", action: "answer", check: (r) => r.bubbles.join(" ").includes("119") },
  { id: "detail-thai-name", msg: "ฟุชิมิ อินะริ คนเยอะไหม", action: "answer", check: (r) => r.bubbles.join(" ").includes("Fushimi") },
];

async function ask(message, context) {
  const t = performance.now();
  const res = await fetch(`${BASE}/api/tabi`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, context }) });
  const ms = Math.round(performance.now() - t);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ms, reply: json.reply, error: json.error };
}

const replies = {};
const rows = [];
for (const c of CASES) {
  const prev = c.after ? replies[c.after] : undefined;
  if (c.after && !prev) { rows.push({ id: c.id, skipped: `needs ${c.after}` }); continue; }
  const { status, ms, reply, error } = await ask(c.msg, c.ctx ? c.ctx(prev) : {});
  await sleep(PACE_MS);
  if (!reply) { rows.push({ id: c.id, status, ms, error: error ?? "no reply", pass: false }); continue; }
  replies[c.id] = reply;
  const checks = {};
  if (c.action) checks.action = reply.action === c.action;
  if (c.month !== undefined) checks.month = (reply.intent.month ?? null) === c.month;
  if (c.days !== undefined) checks.days = reply.intent.durationDays === c.days;
  if (c.date) checks.date = reply.intent.startDate === c.date;
  if (c.check) checks.constraint = Boolean(c.check(reply, prev));
  const placeIds = [...(reply.routes ?? []).flatMap((o) => o.highlights.map((h) => h.id)), ...(reply.stops ?? []).map((s) => s.id), ...(reply.itinerary ?? []).flatMap((d) => d.items.map((i) => i.placeId).filter(Boolean))];
  checks.grounded = placeIds.every((id) => PLACE_IDS.has(id));
  rows.push({
    id: c.id, msg: c.msg, ms, source: reply.source, action: reply.action, checks,
    pass: Object.values(checks).every(Boolean), placesChecked: placeIds.length,
  });
  console.log(`${rows.at(-1).pass ? "PASS" : "FAIL"} ${c.id.padEnd(16)} ${String(ms).padStart(5)}ms ${reply.source} ${reply.action} ${JSON.stringify(checks)}`);
}

// ── metrics ──
const done = rows.filter((r) => r.checks);
const rate = (key) => {
  const xs = done.filter((r) => key in r.checks);
  return { pass: xs.filter((r) => r.checks[key]).length, total: xs.length };
};
const lat = done.map((r) => r.ms).sort((a, b) => a - b);
const q = (p) => lat[Math.min(lat.length - 1, Math.floor(lat.length * p))];
const metrics = {
  base: BASE, runAt: new Date().toISOString(), cases: CASES.length,
  overall: { pass: done.filter((r) => r.pass).length, total: done.length },
  action: rate("action"), month: rate("month"), days: rate("days"), date: rate("date"),
  constraint: rate("constraint"), grounded: rate("grounded"),
  placesChecked: done.reduce((a, r) => a + r.placesChecked, 0),
  jevShare: { jev: done.filter((r) => r.source === "jev").length, total: done.length },
  latencyMs: { p50: q(0.5), p95: q(0.95), max: lat.at(-1) },
};

const pct = ({ pass, total }) => (total ? `${pass}/${total} (${Math.round((100 * pass) / total)}%)` : "–");
const md = `# Tabi agent evaluation

Run: ${metrics.runAt} · target: \`${BASE}\` · ${metrics.cases} scenarios (Thai, incl. a 4-turn conversation)

| Metric | Result |
|---|---|
| All checks pass | ${pct(metrics.overall)} |
| Right action (suggest / ask / open / draft / flights / answer / chat) | ${pct(metrics.action)} |
| Month understood | ${pct(metrics.month)} |
| Trip length understood | ${pct(metrics.days)} |
| Exact date understood | ${pct(metrics.date)} |
| Constraint kept (region, refine stays local, no price claims …) | ${pct(metrics.constraint)} |
| Grounded — every suggested place exists in the place store | ${pct(metrics.grounded)} (${metrics.placesChecked} places checked) |
| Answered by Jev (not keyword fallback) | ${metrics.jevShare.jev}/${metrics.jevShare.total} |
| Latency p50 / p95 / max | ${metrics.latencyMs.p50} / ${metrics.latencyMs.p95} / ${metrics.latencyMs.max} ms |

## Scenarios

| Case | Message | Action | ms | Checks |
|---|---|---|---|---|
${rows.map((r) => r.checks
  ? `| ${r.pass ? "✅" : "❌"} ${r.id} | ${r.msg} | ${r.action} | ${r.ms} | ${Object.entries(r.checks).map(([k, v]) => `${v ? "✓" : "✗"} ${k}`).join(", ")} |`
  : `| ⚠️ ${r.id} | – | – | – | ${r.skipped ?? r.error} |`).join("\n")}

Latency is measured from this machine, so it includes network time to \`${BASE}\`.
`;

mkdirSync(new URL("../docs/eval/", import.meta.url), { recursive: true });
writeFileSync(new URL("../docs/eval/tabi-eval.md", import.meta.url), md);
writeFileSync(new URL("../docs/eval/tabi-eval.json", import.meta.url), JSON.stringify({ metrics, rows }, null, 2));
console.log("\n" + JSON.stringify(metrics, null, 2));
