// "☀️ 19°/10°" beside each day of the plan: the city's 10-year average for that month
// (data/weather/normals.json, Open-Meteo ERA5 2015–2024, CC BY 4.0). Client-safe (~30 KB).
// A town without its own normals borrows the nearest base within 60 km, like the chat answer.

import normalsData from "@/data/weather/normals.json";
import { CITY_BY_NAME, km } from "./cities";

type Normal = [tmax: number, tmin: number, rainDays: number, snowDays: number];
const NORMALS = normalsData as unknown as Record<string, Normal[]>;

export type DayWeather = { icon: string; hi: number; lo: number; label: string };

export function dayWeather(city: string, month?: number): DayWeather | null {
  if (!month) return null;
  let months = NORMALS[city];
  if (!months) {
    const c = CITY_BY_NAME.get(city);
    if (!c) return null;
    const near = Object.keys(NORMALS)
      .map((n) => ({ n, d: CITY_BY_NAME.get(n) ? km(c, CITY_BY_NAME.get(n)!) : Infinity }))
      .sort((a, b) => a.d - b.d)[0];
    if (!near || near.d > 60) return null;
    months = NORMALS[near.n];
  }
  const [tmax, tmin, rain, snow] = months[month - 1];
  const icon = snow >= 3 ? "❄️" : rain >= 12 ? "🌧️" : tmax >= 30 ? "🥵" : "☀️";
  const what = snow >= 3 ? "หิมะตกบ่อย" : rain >= 12 ? "ฝนบ่อย" : tmax >= 30 ? "ร้อนมาก" : "อากาศดี";
  const hi = Math.round(tmax), lo = Math.round(tmin);
  return { icon, hi, lo, label: `อากาศเฉลี่ย ${what} กลางวัน ${hi} องศา กลางคืน ${lo} องศา` };
}
