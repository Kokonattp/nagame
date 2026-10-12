// "ที่เที่ยวเกียวโตมีอะไรบ้าง" / "วัดสวย ๆ ในนาราที่ไหนดี" — a list of sights, not a trip plan.
// Every name comes from data/places/places.json (Wikidata + the curated first-visit list); never invented.
// Server only.

import placesData from "@/data/places/places.json";
import { CITY_BY_NAME, km, REGION_TH } from "./cities";
import type { Place } from "./types";

const PLACES = placesData as unknown as Place[];

const TYPE_TH: Record<string, string> = {
  nature: "ธรรมชาติ", shrine_temple: "วัด/ศาลเจ้า", castle: "ปราสาท", landmark: "จุดเด่น", museum: "พิพิธภัณฑ์",
  theme_park: "สวนสนุก", food_area: "ย่านกิน", onsen: "ออนเซ็น",
};
const TYPE_ASKED: [RegExp, string][] = [
  [/วัด|ศาลเจ้า|temple|shrine/i, "shrine_temple"], [/ปราสาท|castle/i, "castle"], [/ธรรมชาติ|วิว|ภูเขา|น้ำตก|ทะเลสาบ|nature/i, "nature"],
  [/พิพิธภัณฑ์|museum/i, "museum"], [/สวนสนุก|theme park/i, "theme_park"], [/ออนเซ็น|onsen/i, "onsen"],
];

const maps = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

export type SightsAnswer = { bubbles: string[]; links: { label: string; url: string }[]; city?: string };

export function findSights(message: string, focus: string[]): SightsAnswer {
  const where = focus.find((f) => CITY_BY_NAME.has(f) || f.startsWith("region:"));
  if (!where) return { bubbles: [`อยากรู้ที่เที่ยวเมืองไหน? เช่น "ที่เที่ยวเกียวโต" หรือ "วัดในนารา"`], links: [] };
  const region = where.startsWith("region:") ? where.slice(7) : null;
  const placeTh = region ? REGION_TH[region as keyof typeof REGION_TH] : CITY_BY_NAME.get(where)?.th ?? where;
  const type = TYPE_ASKED.find(([re]) => re.test(message))?.[1];
  const what = type ? TYPE_TH[type] : "ที่เที่ยว";

  const inPlace = PLACES.filter((p) => (region ? p.region === region : p.baseCity === where));
  const picks: Place[] = [];
  // the curated first-visit list first, then the best-known (most Wikipedia languages);
  // eating areas are for "where to eat", and one site listed twice (temple + its heritage area) shows once
  for (const p of inPlace
    .filter((p) => (type ? p.type === type : p.type !== "food_area"))
    .sort((a, b) => Number(Boolean(b.mustSee)) - Number(Boolean(a.mustSee)) || b.sitelinks - a.sitelinks)) {
    if (picks.length === 6) break;
    if (!picks.some((q) => km(p, q) < 0.3)) picks.push(p);
  }

  if (!picks.length) {
    return {
      bubbles: [`${what}แถว${placeTh} ทาบิยังไม่มีข้อมูล ลองค้นใน Google Maps ได้เลย`],
      links: [{ label: `ค้น${what}แถว${placeTh} ใน Google Maps`, url: maps(`${type ? type.replace(/_/g, " ") : "things to do"} ${region ?? where} Japan`) }],
    };
  }
  return {
    bubbles: [`${what}แถว${placeTh}ที่คนไปกันเยอะ ${picks.length} ที่ กดดูในแผนที่ได้เลย`, "อยากให้ทาบิจัดเป็นทริปด้วยไหม บอกจำนวนวันมาได้เลย"],
    links: picks.map((p) => ({
      label: `${p.nameTh || p.nameEn} · ${TYPE_TH[p.type] ?? p.type}${region ? ` · ${CITY_BY_NAME.get(p.baseCity)?.th ?? p.baseCity}` : ""}${p.crowd >= 4 ? " · คนเยอะ" : ""}`,
      url: maps(`${p.nameEn} ${p.lat},${p.lon}`),
    })),
    city: region ? undefined : where,
  };
}
