// recommendations-to-pois — แปลง Recommendation[] (มีแค่ area) เป็นหมุดบนแผนที่ washi.
// ตาม [[nagame-v2-direction]] ก้าว G: map ไม่ควรว่างเปล่า — เอาที่กร๊วกแนะมาปักหมุด
// ระดับย่าน (ใช้ area-coords). Recommendation ไม่มี lat/lon จริง → ปักที่กลางย่าน
// แล้ว jitter เล็กน้อยกันหมุดในย่านเดียวกันทับกันจนกดไม่ได้.

import type { Recommendation } from "@/lib/cities/city-configs";
import { getAreaCoord, type LatLon } from "@/lib/cities/area-coords";
import type { MapPoi } from "@/components/map/washi-map";

// WashiMap รู้จักแค่ 2 สไตล์หมุด (stay=กล่องเหลี่ยม, eat=แคปซูล). map 5 kind ลง  2 สไตล์:
// กิน/ช้อป = แคปซูล (eat), พัก/เที่ยว/ทำกิจกรรม = กล่อง (stay).
function poiKind(kind: Recommendation["kind"]): MapPoi["kind"] {
  return kind === "eat" || kind === "shop" ? "eat" : "stay";
}

const KIND_EMOJI: Record<Recommendation["kind"], string> = {
  see: "⛩",
  eat: "🍜",
  sleep: "🛏",
  shop: "🛍",
  do: "🎋",
};

// กระจายหมุดรอบจุดกลางย่านแบบวงกลมเล็ก (~120-180m) กันทับ. deterministic ตาม index
// (ไม่สุ่ม) → SSR/CSR ตรงกัน ไม่มี hydration mismatch.
function jitter(center: LatLon, indexInArea: number, countInArea: number): LatLon {
  if (countInArea <= 1) return center;
  const radius = 0.0014; // ~150m
  const angle = (2 * Math.PI * indexInArea) / countInArea;
  return [center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle)];
}

export type RecommendationSets = {
  see: Recommendation[];
  eat: Recommendation[];
  sleep: Recommendation[];
  shop: Recommendation[];
  do: Recommendation[];
};

/**
 * รวมทุกหมวดเป็นหมุดเดียว. จัดกลุ่มตามย่านก่อน แล้ว jitter ในกลุ่ม.
 * cityCenter = fallback ของย่านที่ไม่มีใน area-coords.
 */
export function recommendationsToPois(sets: RecommendationSets, cityCenter: LatLon): MapPoi[] {
  const all: Recommendation[] = [
    ...sets.see,
    ...sets.eat,
    ...sets.sleep,
    ...sets.shop,
    ...sets.do,
  ];

  // จัดกลุ่มตามพิกัดย่าน (key = "lat,lon") เพื่อ jitter เฉพาะที่ชนกัน
  const byCoord = new Map<string, { rec: Recommendation; coord: LatLon }[]>();
  for (const rec of all) {
    const coord = getAreaCoord(rec.area, cityCenter);
    const key = `${coord[0]},${coord[1]}`;
    const bucket = byCoord.get(key) ?? [];
    bucket.push({ rec, coord });
    byCoord.set(key, bucket);
  }

  const pois: MapPoi[] = [];
  for (const bucket of byCoord.values()) {
    bucket.forEach(({ rec, coord }, i) => {
      const [lat, lon] = jitter(coord, i, bucket.length);
      pois.push({
        id: `${rec.kind}-${rec.title}`,
        kind: poiKind(rec.kind),
        lat,
        lon,
        label: `${KIND_EMOJI[rec.kind]} ${rec.title}`,
      });
    });
  }
  return pois;
}
