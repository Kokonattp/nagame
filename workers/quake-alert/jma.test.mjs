// node --test — 気象庁 XML/JSON parsers against real bulletins (fixtures/jma-*.xml), and that the two
// sources never double-send; weather 警報 planning; Thai epicentre names.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { feedEntries, quakeFromXml, recordFromXml, tsunamiFromXml, warningsByArea } from "./jma.mjs";
import { epicentreTh, jst, newMemory, plan, planWeather } from "./rules.mjs";

const fx = (f) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), "utf8");
const VXSE53 = fx("jma-vxse53-2026-10-16.xml");
const VTSE41 = fx("jma-vtse41-2026-10-09.xml");
const sub = (endpoint, prefectures, extra = {}) => ({ endpoint, prefectures, starts_on: "2026-10-14", ends_on: "2026-10-20", ...extra });

test("feed: only quake/tsunami bulletins are picked", () => {
  const xml = `<feed><entry><title>震源・震度に関する情報</title><id>https://x/20261016035239_0_VXSE53_010000.xml</id><updated>2026-10-16T03:52:39Z</updated></entry>
    <entry><title>降灰予報（定時）</title><id>https://x/20261016050042_0_VFVO53_010000.xml</id><updated>2026-10-16T05:00:00Z</updated></entry></feed>`;
  assert.deepEqual(feedEntries(xml).map((e) => e.url), ["https://x/20261016035239_0_VXSE53_010000.xml"]);
});

test("VXSE53 (real, 16 Oct): same arrival time key as P2PQuake, prefecture max shindo, no tsunami", () => {
  const r = quakeFromXml(VXSE53, "u");
  assert.equal(r.code, 551);
  assert.equal(r.earthquake.time, "2026/10/16 12:38:00"); // P2PQuake said the same for this quake
  assert.equal(r.earthquake.hypocenter.name, "カムチャツカ半島付近");
  assert.equal(r.earthquake.hypocenter.magnitude, 6.9);
  assert.equal(r.earthquake.domesticTsunami, "None");
  assert.deepEqual(r.points, [{ pref: "北海道", scale: 10, isArea: true }]);
});

test("VTSE41 (real, 10 Oct): forecast-only bulletin counts as no warning (cancelled)", () => {
  const r = tsunamiFromXml(VTSE41, "u");
  assert.equal(r.code, 552);
  assert.equal(r.cancelled, true);
  assert.deepEqual(r.areas, []);
});

test("VTSE41 with a 津波警報 zone → Warning area", () => {
  const warned = VTSE41.replace(/<Code>71<\/Code>/, "<Code>51</Code>");
  const r = recordFromXml(warned, "x_VTSE41_y.xml");
  assert.equal(r.cancelled, false);
  assert.deepEqual(r.areas, [{ name: "北海道太平洋沿岸東部", grade: "Warning" }]);
});

test("same quake from P2PQuake then 気象庁 XML → one push", () => {
  const strong = VXSE53.replace(/<MaxInt>1<\/MaxInt>/g, "<MaxInt>5-</MaxInt>");
  const fromJma = quakeFromXml(strong, "u");
  const fromP2p = { ...fromJma, id: "p2p", source: undefined, points: [{ pref: "北海道", scale: 45 }] };
  const subs = [sub("https://fcm.googleapis.com/h", ["Hokkaido"])];
  const mem = newMemory();
  const now = jst(fromJma.time);
  assert.equal(plan(fromP2p, subs, mem, now).length, 1);
  assert.equal(plan(fromJma, subs, mem, now).length, 0);
});

test("Thai epicentre names", () => {
  assert.equal(epicentreTh("千葉県北西部"), "ชิบะ ตะวันตกเฉียงเหนือ (千葉県北西部)");
  assert.equal(epicentreTh("京都府南部"), "เกียวโต ตอนใต้ (京都府南部)");
  assert.equal(epicentreTh("宮城県沖"), "นอกชายฝั่งมิยางิ (宮城県沖)");
  assert.equal(epicentreTh("千葉県東方沖"), "นอกชายฝั่งชิบะ ด้านตะวันออก (千葉県東方沖)");
  assert.equal(epicentreTh("日向灘"), "ทะเลฮิวกะนาดะ (日向灘)");
  assert.equal(epicentreTh("謎の海域"), "謎の海域");
});

const office = (kinds) => [{ warning: { class20Items: [{ areaCode: "2610000", kinds }] } }];
const kyotoTrip = sub("https://fcm.googleapis.com/k", ["Kyoto"], { jma: [{ office: "260000", areas: ["2610000"], th: "เกียวโต" }] });

test("weather: a new 警報 is sent once, a stronger one again, a lifted one re-arms", () => {
  const mem = newMemory();
  const at = jst("2026/10/16 09:00:00");
  const run = (kinds) => planWeather(new Map([["260000", warningsByArea(office(kinds))]]), [kyotoTrip], mem, at);
  const first = run([{ code: "03", status: "発表" }]);
  assert.equal(first.length, 1);
  assert.equal(first[0].payload.title, "⛈️ เตือนฝนตกหนักที่เกียวโต");
  assert.match(first[0].payload.body, /เลี่ยงริมแม่น้ำ/);
  assert.equal(run([{ code: "03", status: "継続" }]).length, 0, "same warning continuing stays quiet");
  const worse = run([{ code: "43", status: "発表" }, { code: "09", status: "発表" }]);
  assert.equal(worse.length, 1);
  assert.match(worse[0].payload.title, /^⚠️ อันตราย: ฝนตกหนัก, ดินถล่ม ที่เกียวโต$/);
  assert.equal(run([{ code: "03", status: "解除" }]).length, 0, "lifting is not pushed");
  assert.equal(run([{ code: "03", status: "発表" }]).length, 1, "a new warning after lifting is pushed");
});

test("weather: advisories and other towns are ignored; an office that failed keeps its state", () => {
  const mem = newMemory();
  const at = jst("2026/10/16 09:00:00");
  assert.equal(planWeather(new Map([["260000", warningsByArea(office([{ code: "03", status: "警報から注意報" }]))]]), [kyotoTrip], mem, at).length, 0);
  const other = [{ warning: { class20Items: [{ areaCode: "2620100", kinds: [{ code: "03", status: "発表" }] }] } }];
  assert.equal(planWeather(new Map([["260000", warningsByArea(other)]]), [kyotoTrip], mem, at).length, 0);
  planWeather(new Map([["260000", warningsByArea(office([{ code: "05", status: "発表" }]))]]), [kyotoTrip], mem, at);
  assert.equal(planWeather(new Map(), [kyotoTrip], mem, at).length, 0);
  assert.equal(planWeather(new Map([["260000", warningsByArea(office([{ code: "05", status: "継続" }]))]]), [kyotoTrip], mem, at).length, 0);
});
