// "หิมะจะตกไหม / หนาวไหม" — answered from numbers, never guessed.
// Normals: data/weather/normals.json (scripts/build-weather-normals.mjs, Open-Meteo ERA5 2015–2024,
// CC BY 4.0). When the trip starts within 14 days, Open-Meteo's live forecast for those days is
// added (free, no key, cached 3 h). Server only.

import normalsData from "@/data/weather/normals.json";
import { CITY_BY_NAME, type Region } from "./cities";
import { SEASON_WEAR } from "./faq";

type Normal = [tmax: number, tmin: number, rainDays: number, snowDays: number];
const NORMALS = normalsData as unknown as Record<string, Normal[]>;

const MONTH_TH = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
/** a region's weather is told by its main city */
const REGION_CITY: Record<Region, string> = {
  hokkaido: "Sapporo", tohoku: "Sendai", kanto: "Tokyo", chubu: "Takayama", kansai: "Kyoto",
  chugoku: "Hiroshima", shikoku: "Matsuyama", kyushu: "Fukuoka", okinawa: "Naha",
};

export type WeatherAnswer = { bubbles: string[]; links: { label: string; url: string }[]; needMonth?: boolean };

const deg = (x: number) => `${Math.round(x)}°C`;

function snowVerdict(n: Normal) {
  const [tmax, , , snow] = n;
  if (snow >= 8 || (snow >= 3 && tmax <= 3)) return "หิมะตกบ่อย ได้เจอหิมะแน่นอน ❄️";
  if (snow >= 2) return "มีโอกาสได้เจอหิมะ ❄️";
  if (snow >= 0.3) return "หิมะตกน้อย ไม่ค่อยได้เจอ";
  return "แทบไม่มีหิมะ";
}

/** Cities to talk about: named in the message, else the trip's stops (max 3), regions → their main city. */
export function weatherCities(focus: string[], tripStops: string[]): string[] {
  const named = focus.map((f) => (f.startsWith("region:") ? REGION_CITY[f.slice(7) as Region] : f));
  const list = (named.length ? named : tripStops).filter((c) => NORMALS[c]);
  return [...new Set(list)].slice(0, 3);
}

type Daily = { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_sum: number[]; snowfall_sum: number[] };

async function forecast(city: string, start: string, days: number): Promise<string | null> {
  const c = CITY_BY_NAME.get(city);
  if (!c) return null;
  const end = new Date(Date.parse(`${start}T00:00:00Z`) + (Math.min(days, 16) - 1) * 86_400_000).toISOString().slice(0, 10);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum&timezone=Asia%2FTokyo&start_date=${start}&end_date=${end}`;
  try {
    const res = await fetch(url, { next: { revalidate: 10_800 }, signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const d = ((await res.json()) as { daily?: Daily }).daily;
    if (!d?.time?.length) return null;
    const snowDays = d.snowfall_sum.filter((s) => (s ?? 0) >= 1).length;
    const rainDays = d.precipitation_sum.filter((p) => (p ?? 0) >= 1).length - snowDays;
    const lo = Math.min(...d.temperature_2m_min), hi = Math.max(...d.temperature_2m_max);
    const parts = [`${deg(lo)} ถึง ${deg(hi)}`];
    if (snowDays) parts.push(`หิมะ ${snowDays} วัน`);
    if (rainDays > 0) parts.push(`ฝน ${rainDays} วัน`);
    if (!snowDays && rainDays <= 0) parts.push("ไม่มีฝนหรือหิมะ");
    return `พยากรณ์ช่วงที่ไป (${d.time.length} วัน) ${c.th}: ${parts.join(" · ")}`;
  } catch {
    return null;
  }
}

export async function weatherAnswer(opts: { cities: string[]; month?: number; startDate?: string; days?: number }): Promise<WeatherAnswer> {
  const links = [{ label: "พยากรณ์อากาศ 気象庁", url: "https://www.jma.go.jp/bosai/forecast/" }];
  const month = opts.startDate ? Number(opts.startDate.slice(5, 7)) : opts.month;
  const lead: string[] = [];
  if (!opts.cities.length) {
    if (!month) return { bubbles: ["อยากรู้อากาศที่เมืองไหน ช่วงเดือนไหน บอกทาบิได้เลย เช่น \"ซัปโปโร ธ.ค. หิมะตกไหม\""], links: [], needMonth: true };
    // "ญี่ปุ่นเดือนมกราหนาวไหม": the country spans 3,000 km — show the north, the middle and the south
    opts = { ...opts, cities: ["Sapporo", "Tokyo", "Naha"] };
    lead.push("ญี่ปุ่นยาวมาก อากาศเหนือ-ใต้ต่างกันเยอะ ทาบิยกตัวอย่าง 3 เมืองนะ");
  }
  if (!month) {
    const names = opts.cities.map((c) => CITY_BY_NAME.get(c)?.th ?? c).join(", ");
    return { bubbles: [`ไป${names}ช่วงเดือนไหน? บอกเดือนมา ทาบิจะบอกว่าหนาวแค่ไหน มีหิมะหรือฝนไหม`], links: [], needMonth: true };
  }
  const bubbles = [...lead, ...opts.cities.map((city) => {
    const n = NORMALS[city][month - 1];
    const [tmax, tmin, rain] = n;
    return `${CITY_BY_NAME.get(city)?.th ?? city} ${MONTH_TH[month]}: กลางวัน ~${deg(tmax)} กลางคืน ~${deg(tmin)} · ฝนหรือหิมะ ~${Math.round(rain)} วัน/เดือน · ${snowVerdict(n)}`;
  })];
  // live forecast only when the trip is close enough for one to exist
  if (opts.startDate) {
    const ahead = (Date.parse(`${opts.startDate}T00:00:00Z`) - Date.now()) / 86_400_000;
    if (ahead >= -1 && ahead <= 14) {
      const live = (await Promise.all(opts.cities.map((c) => forecast(c, opts.startDate!, opts.days ?? 5)))).filter((x): x is string => Boolean(x));
      bubbles.push(...live);
    }
  }
  bubbles.push(`เตรียมตัว: ${SEASON_WEAR[month]} (ตัวเลขเป็นค่าเฉลี่ย 10 ปีจาก Open-Meteo ใกล้วันไปดูพยากรณ์จริงอีกทีนะ)`);
  return { bubbles, links };
}
