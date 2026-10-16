// node --test — acceptance 1–3 of docs/quake-alerts.md, against the real EEW of 2026-10-16 12:38
// (M9.9 estimate off the Kurils, 105 areas warned, cancelled at 12:48).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isActive, jst, newMemory, plan, prefOf } from "./rules.mjs";

const EEW = JSON.parse(readFileSync(new URL("./fixtures/eew-2026-10-16.json", import.meta.url), "utf8"));
const sub = (endpoint, prefectures, starts_on = "2026-10-14", ends_on = "2026-10-20") => ({ endpoint, prefectures, starts_on, ends_on });
const tokyo = sub("https://fcm.googleapis.com/a", ["Tokyo", "Kyoto"]);
const okinawa = sub("https://fcm.googleapis.com/b", ["Okinawa"]);
const finished = sub("https://fcm.googleapis.com/c", ["Tokyo"], "2026-10-01", "2026-10-07");
const SUBS = [tokyo, okinawa, finished];

function replay(records, subs) {
  const mem = newMemory();
  return records.map((r) => plan(r, subs, mem, jst(r.time)));
}

test("prefecture names from EEW areas and quake points", () => {
  assert.equal(prefOf("北海道道東"), "Hokkaido");
  assert.equal(prefOf("東京"), "Tokyo");
  assert.equal(prefOf("東京都"), "Tokyo");
  assert.equal(prefOf("伊豆諸島"), "Tokyo");
  assert.equal(prefOf("京都府"), "Kyoto");
  assert.equal(prefOf("宮古島地方"), "Okinawa");
  assert.equal(prefOf("宮城県"), "Miyagi");
  assert.equal(prefOf("東京湾内湾"), "Tokyo");
  assert.equal(prefOf("伊勢・三河湾"), null);
});

test("trip window: a day of slack each side, Japan date", () => {
  const at = (s) => jst(s);
  assert.equal(isActive(sub("x", [], "2026-10-17", "2026-10-20"), at("2026/10/16 00:10:00")), true);
  assert.equal(isActive(sub("x", [], "2026-10-18", "2026-10-20"), at("2026/10/16 23:50:00")), false);
  assert.equal(isActive(sub("x", [], "2026-10-10", "2026-10-15"), at("2026/10/16 23:59:00")), true);
  assert.equal(isActive(sub("x", [], "2026-10-10", "2026-10-14"), at("2026/10/16 00:01:00")), false);
});

test("real EEW: Tokyo trip gets one warning listing prefectures, then the cancel", () => {
  const [first, second, cancel] = replay(EEW, SUBS);
  assert.equal(first.length, 1);
  assert.equal(first[0].sub, tokyo);
  const { title, body, urgent, tag } = first[0].payload;
  assert.match(title, /เตือนแผ่นดินไหว/);
  assert.ok(body.startsWith("📍 โตเกียว"), body);
  assert.match(body, /ฮอกไกโด/);
  assert.match(body, /และอีก \d+ จังหวัด/);
  assert.match(body, /気象庁/);
  assert.equal(urgent, true);
  assert.equal(second.length, 0, "serial 2 of the same event stays quiet");
  assert.equal(cancel.length, 1);
  assert.equal(cancel[0].sub, tokyo);
  assert.equal(cancel[0].payload.tag, tag, "cancel replaces the warning on the phone");
  assert.match(cancel[0].payload.title, /ยกเลิก/);
});

test("cancel with nothing sent stays quiet; test EEWs and stale EEWs are ignored", () => {
  const mem = newMemory();
  assert.deepEqual(plan(EEW[2], SUBS, mem, jst(EEW[2].time)), []);
  assert.deepEqual(plan({ ...EEW[0], test: true }, SUBS, newMemory(), jst(EEW[0].time)), []);
  assert.deepEqual(plan(EEW[0], SUBS, newMemory(), jst(EEW[0].time) + 10 * 60_000), []);
});

test("one phone with two trips gets each alert once", () => {
  const a = sub("https://fcm.googleapis.com/same", ["Kyoto"]);
  const b = sub("https://fcm.googleapis.com/same", ["Tokyo"], "2026-10-16", "2026-10-18");
  const [warn, , cancel] = replay(EEW, [a, b]);
  assert.equal(warn.length, 1);
  assert.ok(warn[0].payload.body.startsWith("📍 โตเกียว"), warn[0].payload.body);
  assert.equal(cancel.length, 1);
});

const quake = (scale, extra = {}) => ({
  code: 551, time: "2026/10/16 15:00:30.000", issue: { type: "DetailScale", time: "2026/10/16 15:00:29" },
  earthquake: { time: "2026/10/16 14:58:00", domesticTsunami: "None", hypocenter: { name: "千葉県北西部", magnitude: 5.4 } },
  points: [{ pref: "東京都", scale, isArea: false }, { pref: "千葉県", scale: 30, isArea: false }], ...extra,
});

test("quake info: shindo 4 in your prefecture is quiet, 5 lower is sent once", () => {
  assert.equal(replay([quake(40)], SUBS)[0].length, 0);
  const [sent, again] = replay([quake(45), { ...quake(50), issue: { type: "DetailScale" } }], SUBS);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].sub, tokyo);
  assert.equal(sent[0].payload.title, "แผ่นดินไหวระดับ 5 ล่าง ที่โตเกียว");
  assert.match(sent[0].payload.body, /ไม่มีความเสี่ยงสึนามิ/);
  assert.equal(again.length, 0, "same quake (by time) is not re-sent");
  assert.equal(replay([quake(60, { issue: { type: "Foreign" } })], SUBS)[0].length, 0);
});

const tsunami = (areas, cancelled = false) => ({ code: 552, time: "2026/10/16 15:03:00.000", cancelled, issue: { type: "Focus", time: "2026/10/16 15:03:00" }, areas });

test("tsunami: a warning reaches everyone on a trip, a watch only nearby, cancel only those told", () => {
  const watch = tsunami([{ grade: "Watch", name: "東京湾内湾" }]);
  const warn = tsunami([{ grade: "Warning", name: "千葉県九十九里・外房" }, { grade: "Watch", name: "東京湾内湾" }]);
  const [w1, w2, again, cancel] = replay([watch, warn, warn, tsunami([], true)], SUBS);
  assert.deepEqual(w1.map((s) => s.sub), [tokyo]);
  assert.deepEqual(w2.map((s) => s.sub), [tokyo, okinawa]);
  assert.equal(w2[0].payload.title, "🌊 เตือนสึนามิ");
  assert.match(w2[0].payload.body, /千葉県九十九里・外房/);
  assert.equal(again.length, 0);
  assert.deepEqual(cancel.map((s) => s.sub), [tokyo, okinawa]);
});
