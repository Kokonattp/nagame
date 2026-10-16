// 気象庁 official sources, read directly (no relay) — pure parsers, tested in jma.test.mjs.
//  1. 防災情報XML feed (eqvol.xml, updated every minute): 震度速報 VXSE51, 震源・震度情報 VXSE53,
//     津波警報・注意報 VTSE41 → converted to the same shape as P2PQuake records, so rules.mjs treats both
//     sources alike and its memory (keyed by arrival time / tsunami rank) never sends the same event twice.
//  2. bosai warning JSON per forecast office → weather 警報 per municipality (same codes as lib/tabi/alerts.ts).

export const FEED_URL = "https://www.data.jma.go.jp/developer/xml/feed/eqvol.xml";
export const WARNING_URL = (office) => `https://www.jma.go.jp/bosai/warning/data/r8/${office}.json`;
const WANTED = /_(VXSE51|VXSE53|VTSE41)_/;

const tag = (xml, name) => xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`))?.[1]?.trim() ?? "";
const tags = (xml, name) => [...xml.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "g"))].map((m) => m[1]);

/** "2026-10-16T12:38:00+09:00" → P2PQuake style "2026/10/16 12:38:00" (JST). */
function p2pTime(iso) {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  return new Date(ms + 9 * 3_600_000).toISOString().slice(0, 19).replace("T", " ").replace(/-/g, "/");
}

/** Feed entries worth fetching (newest first, as JMA lists them). */
export function feedEntries(feedXml) {
  return tags(feedXml, "entry")
    .map((e) => ({ url: tag(e, "id"), updated: tag(e, "updated") }))
    .filter((e) => WANTED.test(e.url));
}

const INT_SCALE = { 1: 10, 2: 20, 3: 30, 4: 40, "5-": 45, "5+": 50, "6-": 55, "6+": 60, 7: 70 };

/** VXSE51/53 → a P2PQuake 551-like record (null if cancelled or unreadable). */
export function quakeFromXml(xml, url = "") {
  if (tag(xml, "InfoType") === "取消") return null;
  const arrival = tag(tag(xml, "Earthquake"), "ArrivalTime") || tag(xml, "TargetDateTime");
  const time = p2pTime(arrival);
  if (!time) return null;
  const quake = tag(xml, "Earthquake");
  const area = tag(tag(quake, "Hypocenter"), "Area");
  const mag = Number(tag(quake, "jmx_eb:Magnitude"));
  const comments = tag(xml, "Comments");
  const points = tags(tag(xml, "Observation"), "Pref").map((p) => ({
    pref: tag(p, "Name"), scale: INT_SCALE[tag(p, "MaxInt")] ?? 0, isArea: true,
  }));
  return {
    code: 551, id: `jma:${url || time}`, source: "jma",
    time: p2pTime(tag(xml, "ReportDateTime")),
    issue: { type: /VXSE51/.test(url) ? "ScalePrompt" : "DetailScale", time: p2pTime(tag(xml, "ReportDateTime")) },
    earthquake: {
      time,
      // 0215 = 津波の心配はありません; anything else means "watch the tsunami bulletins"
      domesticTsunami: /\b0215\b/.test(tag(comments, "Code")) ? "None" : "Checking",
      hypocenter: { name: tag(area, "Name"), magnitude: Number.isFinite(mag) ? mag : -1 },
    },
    points,
  };
}

// 津波警報・注意報 kind codes (JMA code table): 52/53 大津波警報, 51 津波警報, 62 津波注意報, 50/60 解除
const TSUNAMI_GRADE = { 52: "MajorWarning", 53: "MajorWarning", 51: "Warning", 62: "Watch" };

/** VTSE41 → a P2PQuake 552-like record. All zones lifted (or 取消) → cancelled. */
export function tsunamiFromXml(xml, url = "") {
  const reported = p2pTime(tag(xml, "ReportDateTime"));
  const items = tags(tag(xml, "Forecast"), "Item").map((it) => ({
    name: tag(tag(it, "Area"), "Name"),
    grade: TSUNAMI_GRADE[tag(tag(tag(it, "Category"), "Kind"), "Code")],
  }));
  const areas = items.filter((a) => a.grade);
  return {
    code: 552, id: `jma:${url || reported}`, source: "jma", time: reported,
    cancelled: tag(xml, "InfoType") === "取消" || areas.length === 0,
    issue: { type: "Focus", time: reported },
    areas,
  };
}

/** JMA XML document → record for rules.plan(), or null. */
export function recordFromXml(xml, url) {
  if (/VTSE41/.test(url)) return tsunamiFromXml(xml, url);
  if (/VXSE5[13]/.test(url)) return quakeFromXml(xml, url);
  return null;
}

// ── weather 警報 (bosai warning JSON) ──
/** 警報 (30) / 危険警報 (40) / 特別警報 (50) a traveller must act on — keep in step with lib/tabi/alerts.ts. */
export const WEATHER_KINDS = {
  "03": { hazard: "rain", level: 30 }, "43": { hazard: "rain", level: 40 }, "33": { hazard: "rain", level: 50 },
  "09": { hazard: "landslide", level: 30 }, "49": { hazard: "landslide", level: 40 }, "39": { hazard: "landslide", level: 50 },
  "05": { hazard: "wind", level: 30 }, "35": { hazard: "wind", level: 50 },
  "02": { hazard: "snowstorm", level: 30 }, "32": { hazard: "snowstorm", level: 50 },
  "06": { hazard: "snow", level: 30 }, "36": { hazard: "snow", level: 50 },
  "48": { hazard: "surge", level: 40 }, "38": { hazard: "surge", level: 50 },
  "37": { hazard: "waves", level: 50 },
};
const liveStatus = (status = "") => status !== "解除" && !status.includes("なし") && !status.endsWith("注意報");

/** Office JSON → Map(areaCode → Map(hazard → level)) of warnings in force now. */
export function warningsByArea(reports) {
  const out = new Map();
  if (!Array.isArray(reports)) return out;
  for (const report of reports) {
    for (const item of report?.warning?.class20Items ?? []) {
      if (!item.areaCode) continue;
      for (const k of item.kinds ?? []) {
        const kind = WEATHER_KINDS[k.code];
        if (!kind || !liveStatus(k.status)) continue;
        const area = out.get(item.areaCode) ?? new Map();
        if ((area.get(kind.hazard) ?? 0) < kind.level) area.set(kind.hazard, kind.level);
        out.set(item.areaCode, area);
      }
    }
  }
  return out;
}
