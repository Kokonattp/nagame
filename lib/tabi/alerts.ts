// Live natural-hazard warnings from the Japan Meteorological Agency (気象庁), server-side only.
// Shown only at 警報 (warning) level or higher — advisories (注意報) are noise for a traveller.
// Source: the JSON behind https://www.jma.go.jp/bosai/warning/ (new system from 28 May 2026,
// path /bosai/warning/data/r8/<office>.json). Kind codes and levels are read from that page's
// own script; it is not a versioned API, so any parse failure means "no alert", never a guess.

import { CITY_BY_NAME } from "./cities";

const BASE = process.env.JMA_WARNING_BASE ?? "https://www.jma.go.jp/bosai/warning/data/r8/";

/** JMA forecast office + municipality (class20) codes for each base city. From bosai/common/const/area.json. */
const JMA_AREAS: Record<string, { office: string; areas: string[] }> = {
  Tokyo: { office: "130000", areas: ["1310100"] },
  Osaka: { office: "270000", areas: ["2710000"] },
  Kyoto: { office: "260000", areas: ["2610000"] },
  Sapporo: { office: "016000", areas: ["0110000"] },
  Nagoya: { office: "230000", areas: ["2310000"] },
  Yokohama: { office: "140000", areas: ["1410011", "1410012"] },
  Nara: { office: "290000", areas: ["2920101", "2920102"] },
  Kobe: { office: "280000", areas: ["2811000"] },
  Hiroshima: { office: "340000", areas: ["3410100"] },
  Kanazawa: { office: "170000", areas: ["1720100"] },
  Takayama: { office: "210000", areas: ["2120300"] },
  Kawaguchiko: { office: "190000", areas: ["1943000"] },
  Hakone: { office: "140000", areas: ["1438200"] },
  Naha: { office: "471000", areas: ["4720100"] },
  Kamakura: { office: "140000", areas: ["1420400"] },
  Nikko: { office: "090000", areas: ["0920602"] },
  Matsumoto: { office: "200000", areas: ["2020201"] },
  Nagano: { office: "200000", areas: ["2020111"] },
  Sendai: { office: "040000", areas: ["0410001", "0410002"] },
  Kagoshima: { office: "460100", areas: ["4620100"] },
  Beppu: { office: "440000", areas: ["4420200"] },
  Kumamoto: { office: "430000", areas: ["4310000"] },
  Miyajima: { office: "340000", areas: ["3421300"] },
  Ishigaki: { office: "474000", areas: ["4720700"] },
  Matsuyama: { office: "380000", areas: ["3820100"] },
  Okayama: { office: "330000", areas: ["3310000"] },
  Kurashiki: { office: "330000", areas: ["3320200"] },
  Takamatsu: { office: "370000", areas: ["3720100"] },
  Aomori: { office: "020000", areas: ["0220100"] },
  Hakodate: { office: "017000", areas: ["0120200"] },
  Otaru: { office: "016000", areas: ["0120300"] },
  Asahikawa: { office: "012000", areas: ["0120400"] },
  Shizuoka: { office: "220000", areas: ["2210001", "2210002"] },
  Atami: { office: "220000", areas: ["2220500"] },
  Izu: { office: "220000", areas: ["2222200"] },
  Himeji: { office: "280000", areas: ["2820100"] },
  Wakayama: { office: "300000", areas: ["3020100"] },
  Koyasan: { office: "300000", areas: ["3034400"] },
  Karuizawa: { office: "200000", areas: ["2032100"] },
  Yufuin: { office: "440000", areas: ["4421300"] },
  Toyama: { office: "160000", areas: ["1620111"] },
  Fukuoka: { office: "400000", areas: ["4013000"] },
};

export const ALERT_CITIES = new Set(Object.keys(JMA_AREAS));
/** The JMA municipality codes for a base city (volcano warnings are issued by these too). */
export const jmaAreasFor = (city: string) => JMA_AREAS[city]?.areas ?? [];
/** Forecast office + municipality codes the quake-alert worker polls for weather 警報 (undefined = not covered). */
export const jmaWatch = (city: string) => JMA_AREAS[city];

/** Hazards a traveller must act on, at 警報 (30) / 危険警報 (40) / 特別警報 (50). Wave/tide only when severe. */
const KINDS: Record<string, { hazard: string; level: 30 | 40 | 50 }> = {
  "03": { hazard: "ฝนตกหนัก", level: 30 }, "43": { hazard: "ฝนตกหนัก", level: 40 }, "33": { hazard: "ฝนตกหนัก", level: 50 },
  "09": { hazard: "ดินถล่ม", level: 30 }, "49": { hazard: "ดินถล่ม", level: 40 }, "39": { hazard: "ดินถล่ม", level: 50 },
  "05": { hazard: "ลมแรง", level: 30 }, "35": { hazard: "ลมแรง", level: 50 },
  "02": { hazard: "พายุหิมะ", level: 30 }, "32": { hazard: "พายุหิมะ", level: 50 },
  "06": { hazard: "หิมะตกหนัก", level: 30 }, "36": { hazard: "หิมะตกหนัก", level: 50 },
  "48": { hazard: "น้ำทะเลหนุนสูง", level: 40 }, "38": { hazard: "น้ำทะเลหนุนสูง", level: 50 },
  "37": { hazard: "คลื่นสูง", level: 50 },
};

export type HazardAlert = { city: string; cityTh: string; hazard: string; level: 30 | 40 | 50; url: string };

type JmaKind = { code?: string; status?: string };
type JmaReport = { warning?: { class20Items?: { areaCode?: string; kinds?: JmaKind[] }[] } };

/** "解除" (lifted), "発表警報・注意報はなし" (none) and "…から注意報" (downgraded) are not alerts. */
const isActive = (status = "") => status !== "解除" && !status.includes("なし") && !status.endsWith("注意報");

export function parseAlerts(city: string, reports: unknown): HazardAlert[] {
  const area = JMA_AREAS[city];
  if (!area || !Array.isArray(reports)) return [];
  const best = new Map<string, HazardAlert>();
  for (const report of reports as JmaReport[]) {
    for (const item of report?.warning?.class20Items ?? []) {
      if (!item.areaCode || !area.areas.includes(item.areaCode)) continue;
      for (const k of item.kinds ?? []) {
        const kind = k.code ? KINDS[k.code] : undefined;
        if (!kind || !isActive(k.status)) continue;
        const prev = best.get(kind.hazard);
        if (!prev || prev.level < kind.level) {
          best.set(kind.hazard, {
            city,
            cityTh: CITY_BY_NAME.get(city)?.th ?? city,
            hazard: kind.hazard,
            level: kind.level,
            url: `https://www.jma.go.jp/bosai/warning/#area_type=offices&area_code=${area.office}`,
          });
        }
      }
    }
  }
  return [...best.values()];
}

/** Current warnings for the given cities; an office that fails to load simply contributes nothing. */
export async function fetchAlerts(cities: string[]): Promise<HazardAlert[]> {
  const wanted = [...new Set(cities)].filter((c) => ALERT_CITIES.has(c));
  const offices = [...new Set(wanted.map((c) => JMA_AREAS[c].office))];
  const data = new Map<string, unknown>();
  await Promise.all(offices.map(async (office) => {
    try {
      const res = await fetch(`${BASE}${office}.json`, { signal: AbortSignal.timeout(4000), next: { revalidate: 600 } });
      if (res.ok) data.set(office, await res.json());
    } catch { /* unreachable office → no alert for it */ }
  }));
  return wanted
    .flatMap((c) => parseAlerts(c, data.get(JMA_AREAS[c].office)))
    .sort((a, b) => b.level - a.level);
}
