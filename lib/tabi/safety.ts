// Trip safety from the Japan Meteorological Agency (気象庁), server-side only, beside the weather
// warnings in alerts.ts. Only what a traveller must act on is returned:
//   • earthquakes of shindo 5- or stronger in the last 24 h in a prefecture on the route
//   • tsunami warnings (津波警報 / 大津波警報) issued in the last 24 h, anywhere in Japan
//   • volcano warnings (噴火警報 / 火口周辺警報) for a municipality on the route
// Sources are the JSON behind https://www.jma.go.jp/bosai/ (quake, tsunami, volcano). Not a
// versioned API: anything that fails to load or parse means "nothing to show", never a guess.

import { CITY_BY_NAME } from "./cities";
import { ALERT_CITIES, fetchAlerts, jmaAreasFor, type HazardAlert } from "./alerts";

const BOSAI = process.env.JMA_BOSAI_BASE ?? "https://www.jma.go.jp/bosai/";

/** JIS prefecture codes (JMA quake reports list intensity per prefecture by these). */
const PREF_CODE: Record<string, string> = {
  Hokkaido: "01", Aomori: "02", Iwate: "03", Miyagi: "04", Akita: "05", Yamagata: "06", Fukushima: "07",
  Ibaraki: "08", Tochigi: "09", Gunma: "10", Saitama: "11", Chiba: "12", Tokyo: "13", Kanagawa: "14",
  Niigata: "15", Toyama: "16", Ishikawa: "17", Fukui: "18", Yamanashi: "19", Nagano: "20", Gifu: "21",
  Shizuoka: "22", Aichi: "23", Mie: "24", Shiga: "25", Kyoto: "26", Osaka: "27", Hyogo: "28", Nara: "29",
  Wakayama: "30", Tottori: "31", Shimane: "32", Okayama: "33", Hiroshima: "34", Yamaguchi: "35",
  Tokushima: "36", Kagawa: "37", Ehime: "38", Kochi: "39", Fukuoka: "40", Saga: "41", Nagasaki: "42",
  Kumamoto: "43", Oita: "44", Miyazaki: "45", Kagoshima: "46", Okinawa: "47",
};

export type SafetyEvent =
  | { kind: "quake"; at: string; shindo: string; areaJa: string; prefsTh: string; url: string }
  | { kind: "tsunami"; at: string; level: string; areaJa: string; url: string }
  | { kind: "volcano"; volcano: string; level: string; cityTh: string; url: string };

export type Safety = { alerts: HazardAlert[]; events: SafetyEvent[] };

/** "5-" "5+" "6-" "6+" "7" → comparable number (5- = 5.0, 5+ = 5.5 …) */
const shindoValue = (s = "") => {
  const m = String(s).match(/^(\d)([+-])?$/);
  return m ? Number(m[1]) + (m[2] === "+" ? 0.5 : 0) : 0;
};
const SHINDO_TH = (s: string) => `${s[0]}${s[1] === "+" ? " บน" : s[1] === "-" ? " ล่าง" : ""}`;

async function getJson(path: string): Promise<unknown> {
  try {
    const res = await fetch(`${BOSAI}${path}`, { signal: AbortSignal.timeout(4000), next: { revalidate: 300 } });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

type Quake = { at?: string; anm?: string; maxi?: string; int?: { code?: string; maxi?: string }[]; ttl?: string };
type Tsunami = { at?: string; anm?: string; ttl?: string; ift?: string; kind?: { kind?: string }[] };
type VolcanoReport = { volcanoInfos?: { type?: string; items?: { name?: string; code?: string; areas?: { name?: string; code?: string }[] }[] }[] };

/** `prefs`: JIS prefecture code → the Thai names of the route's cities in it ("28" → "โกเบ"). */
export function parseQuakes(list: unknown, prefs: Map<string, string>, now = Date.now()): SafetyEvent[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: SafetyEvent[] = [];
  for (const q of list as Quake[]) {
    if (!q.at || now - Date.parse(q.at) > 86_400_000) continue;
    const hit = (q.int ?? []).filter((i) => i.code && prefs.has(i.code) && shindoValue(i.maxi) >= 5);
    if (!hit.length) continue;
    const key = `${q.at}-${q.anm}`;
    if (seen.has(key)) continue; // the same quake is reported several times as details arrive
    seen.add(key);
    const strongest = hit.reduce((a, b) => (shindoValue(b.maxi) > shindoValue(a.maxi) ? b : a));
    const names = [...new Set(hit.map((h) => prefs.get(h.code!)!))];
    out.push({ kind: "quake", at: q.at, shindo: SHINDO_TH(strongest.maxi!), areaJa: q.anm ?? "", prefsTh: `แถว${names.join(", ")}`, url: "https://www.jma.go.jp/bosai/map.html#contents=earthquake_map" });
  }
  return out;
}

export function parseTsunami(list: unknown, now = Date.now()): SafetyEvent[] {
  if (!Array.isArray(list)) return [];
  for (const t of list as Tsunami[]) {
    if (!t.at || now - Date.parse(t.at) > 86_400_000 || t.ift === "取消") continue;
    const kinds = (t.kind ?? []).map((k) => k.kind ?? "");
    // 津波予報 (slight sea-level change) and 注意報 are not something to act on away from the shore
    const level = kinds.some((k) => k.includes("大津波警報")) ? "大津波警報" : kinds.some((k) => /津波警報/.test(k) && !k.includes("解除")) ? "津波警報" : null;
    if (level) return [{ kind: "tsunami", at: t.at, level, areaJa: t.anm ?? "", url: "https://www.jma.go.jp/bosai/map.html#contents=tsunami" }];
  }
  return [];
}

export function parseVolcanoes(reports: unknown, cityAreas: { city: string; areas: string[] }[]): SafetyEvent[] {
  if (!Array.isArray(reports)) return [];
  const out = new Map<string, SafetyEvent>();
  for (const r of reports as VolcanoReport[]) {
    const infos = r.volcanoInfos ?? [];
    const volcano = infos.find((i) => i.type?.includes("対象火山"))?.items?.[0]?.areas?.[0]?.name ?? "ภูเขาไฟ";
    for (const info of infos) {
      if (!info.type?.includes("対象市町村等")) continue;
      for (const item of info.items ?? []) {
        // 噴火予報 (level 1, "be aware it is active") is not a warning
        if (!item.name || !/警報/.test(item.name)) continue;
        for (const { city, areas } of cityAreas) {
          if (!(item.areas ?? []).some((a) => a.code && areas.includes(a.code))) continue;
          out.set(`${city}-${volcano}`, { kind: "volcano", volcano, level: item.name, cityTh: CITY_BY_NAME.get(city)?.th ?? city, url: "https://www.jma.go.jp/bosai/map.html#contents=volcano" });
        }
      }
    }
  }
  return [...out.values()];
}

/** Everything a traveller on these cities should know right now (weather warnings via alerts.ts). */
export async function fetchSafety(cities: string[]): Promise<Safety> {
  const wanted = [...new Set(cities)].filter((c) => CITY_BY_NAME.has(c));
  const prefs = new Map<string, string>();
  for (const c of wanted) {
    const code = PREF_CODE[CITY_BY_NAME.get(c)!.prefecture ?? ""];
    if (code) prefs.set(code, [prefs.get(code), CITY_BY_NAME.get(c)!.th].filter(Boolean).join(", "));
  }
  const cityAreas = wanted.filter((c) => ALERT_CITIES.has(c)).map((c) => ({ city: c, areas: jmaAreasFor(c) }));
  const [alerts, quakes, tsunami, volcano] = await Promise.all([
    fetchAlerts(wanted),
    getJson("quake/data/list.json"),
    getJson("tsunami/data/list.json"),
    getJson("volcano/data/warning.json"),
  ]);
  return { alerts, events: [...parseTsunami(tsunami), ...parseQuakes(quakes, prefs), ...parseVolcanoes(volcano, cityAreas)] };
}
