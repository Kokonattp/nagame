// Getting around Japan (docs/spec-nagame-m2-tickets.md §4): no paid timetable API.
// Live trains come from Google Maps transit links; Tabi only adds what helps decide.

import { CITY_BY_NAME, km } from "./cities";
import type { RouteOption } from "./types";

/** Where Google Maps should start/end for a base city when "<city> Station" is not the right stop. */
const STATION: Record<string, string> = {
  Hakone: "Hakone-Yumoto Station",
  Nikko: "Tobu-Nikko Station",
  Koyasan: "Koyasan Station",
  Miyajima: "Miyajimaguchi Station",
  Izu: "Shuzenji Station",
  Fukuoka: "Hakata Station",
  Kobe: "Sannomiya Station",
  Kagoshima: "Kagoshima-Chuo Station",
  Naha: "Kenchomae Station",
  Ishigaki: "Ishigaki Port Terminal",
  // Tabi-only bases (2026-10-12): bus towns, ports, and stations named differently from the town
  "Shirakawa-go": "Shirakawa-go Bus Terminal",
  Takachiho: "Takachiho Bus Center",
  "Kurokawa Onsen": "Kurokawa Onsen",
  "Ginzan Onsen": "Ginzan Onsen",
  Shiretoko: "Utoro Onsen Bus Terminal",
  Toya: "Toyako Onsen Bus Terminal",
  Towada: "Towadako Yasumiya",
  Sounkyo: "Sounkyo Bus Terminal",
  Hongu: "Hongu Taisha-mae Bus Stop",
  Unzen: "Unzen Onsen",
  "Iya Valley": "Oboke Station",
  Tsumago: "Nagiso Station",
  Kusatsu: "Kusatsu Onsen Bus Terminal",
  "Nozawa Onsen": "Nozawa Onsen",
  "Gujo Hachiman": "Gujo-Hachiman Station",
  Kurobe: "Unazuki-Onsen Station",
  Kinosaki: "Kinosaki Onsen Station",
  Matsushima: "Matsushima-Kaigan Station",
  Shimoda: "Izukyu-Shimoda Station",
  Ise: "Iseshi Station",
  Nachikatsuura: "Kii-Katsuura Station",
  Wajima: "Wajima Ekimae Bus Stop",
  Sado: "Ryotsu Port",
  Yakushima: "Miyanoura Port",
  Zamami: "Zamami Port",
  Iriomote: "Uehara Port",
  Miyakojima: "Miyako Airport",
  Nago: "Nago Bus Terminal",
};

/** Airports behind each gateway code (Tokyo has two; Thai flights land at either). */
export const AIRPORTS: Record<string, { code: string; th: string; query: string }[]> = {
  TYO: [
    { code: "NRT", th: "นาริตะ", query: "Narita International Airport" },
    { code: "HND", th: "ฮาเนดะ", query: "Haneda Airport" },
  ],
  OSA: [{ code: "KIX", th: "คันไซ", query: "Kansai International Airport" }],
  NGO: [{ code: "NGO", th: "ชูบุ", query: "Chubu Centrair International Airport" }],
  FUK: [{ code: "FUK", th: "ฟุกุโอกะ", query: "Fukuoka Airport" }],
  CTS: [{ code: "CTS", th: "ชิโตเสะ", query: "New Chitose Airport" }],
  OKA: [{ code: "OKA", th: "นาฮะ", query: "Naha Airport" }],
};

export const stationFor = (city: string) => STATION[city] ?? `${city} Station`;

/**
 * "พักที่ไหนดี" for a base city without a hand-written line (lib/tabi/stay.ts): next to where the
 * next leg leaves — the station, bus terminal or port — or in the onsen village / town itself.
 */
export function stayNear(city: string): string {
  const stop = stationFor(city);
  if (/ Station$/.test(stop)) return `ใกล้ ${stop} ลากกระเป๋าไปต่อเมืองอื่นสะดวก`;
  if (/Bus (?:Terminal|Center|Stop)$/.test(stop)) return `ใกล้ ${stop} ขึ้นรถบัสต่อสะดวก`;
  if (/ Port(?: Terminal)?$/.test(stop)) return `ใกล้ ${stop} ขึ้นเรือต่อสะดวก`;
  const th = CITY_BY_NAME.get(city)?.th ?? city;
  return /onsen|ออนเซ็น/i.test(`${city} ${stop} ${th}`) ? `ในหมู่บ้าน${th} เดินไปบ่อน้ำร้อนได้` : `ในตัว${th}`;
}

/** Google Maps transit directions (free Maps URL; live timetable shown by Google). */
export function mapsTransit(origin: string, destination: string) {
  const q = new URLSearchParams({ api: "1", origin, destination, travelmode: "transit" });
  return `https://www.google.com/maps/dir/?${q}`;
}

export type LegLink = { label: string; url: string };

/**
 * Links for one move (`from`/`to` from the itinerary). An airport end with two
 * airports (Tokyo) gives one link per airport; unknown ends give none.
 */
export function legLinks(from?: string, to?: string): LegLink[] {
  if (!from || !to) return [];
  const ends = (end: string) =>
    end.startsWith("airport:")
      ? (AIRPORTS[end.slice(8)] ?? []).map((a) => ({ query: a.query, label: a.th }))
      : CITY_BY_NAME.has(end) ? [{ query: stationFor(end), label: "" }] : [];
  const a = ends(from);
  const b = ends(to);
  if (!a.length || !b.length) return [];
  const many = a.length > 1 ? a : b.length > 1 ? b : null;
  return many
    ? many.map((m) => ({ label: m.label, url: a.length > 1 ? mapsTransit(m.query, b[0].query) : mapsTransit(a[0].query, m.query) }))
    : [{ label: "", url: mapsTransit(a[0].query, b[0].query) }];
}

/**
 * Should this trip buy a nationwide JR Pass (7 days, ¥50,000 or more since 1 Oct 2026)?
 * Upper bound, not a fare: rail distance ≈ straight line × 1.25, at ≤ ¥30/km
 * (Nozomi Tokyo–Shin-Osaka is ~¥27/km reserved) plus ~¥6,000 for airport trains.
 * Below the pass price even at that ceiling → tickets per ride are cheaper.
 */
export function jrPassWorthIt(route: RouteOption): boolean {
  const railKm = route.stops.slice(1).reduce((sum, s, i) => sum + km(route.stops[i], s) * 1.25, 0);
  return railKm * 30 + 6_000 >= 50_000;
}
