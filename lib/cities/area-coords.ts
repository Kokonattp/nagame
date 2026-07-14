// area-coords — lookup ย่าน → พิกัด สำหรับ "แชทแนะย่าน → เปิดแผนที่ที่ย่านนั้น".
// ตาม [[nagame-v2-direction]]: แชท = router. Recommendation มีแค่ area (ชื่อย่าน)
// ไม่มี lat/lon → เชื่อม "ระดับย่าน" ไม่ใช่ปักหมุดร้านเป๊ะ (เจ้าของเลือก least-regret).
//
// key = ย่าน (ตรงกับ Recommendation.area ใน city-configs). เมืองแรก = โตเกียว (แม่นสุด).
// ย่านที่ไม่มีในตาราง → fallback = city center (getAreaCoord รับ center มาเป็น default).
// พิกัดเป็นค่ากลางย่านแบบคร่าว (ไม่ต้องเป๊ะระดับตึก — แค่เลื่อนแผนที่ให้ถูกย่าน).

export type LatLon = [number, number];

// map ตรงตาม Recommendation.area (รวมรูปแบบมี " / " ที่พบใน config เช่น "Ginza / Shinjuku")
const AREA_COORDS: Record<string, LatLon> = {
  // ── โตเกียว 東京 ──
  Harajuku: [35.6702, 139.7027],
  Marunouchi: [35.6812, 139.7671],
  "Ginza / Shinjuku": [35.6717, 139.7649], // ใช้ Ginza เป็นหลัก
  Ginza: [35.6717, 139.7649],
  Tsukiji: [35.6654, 139.7707],
  Shinjuku: [35.6896, 139.7006],
  Ueno: [35.7141, 139.7774],
  Asakusa: [35.7148, 139.7967],
  Shibuya: [35.6595, 139.7005],

  // ── โอซาก้า 大阪 ──
  Dotonbori: [34.6687, 135.5013],
  Namba: [34.6659, 135.5006],
  Nipponbashi: [34.6614, 135.5062],
  Umeda: [34.7025, 135.4959],
  Tennoji: [34.6465, 135.5133],

  // ── เกียวโต 京都 ──
  Higashiyama: [35.0037, 135.7788],
  Arashiyama: [34.985, 135.6673],
  "Central Kyoto": [35.0116, 135.7681],
  "Central Kyoto ": [35.0116, 135.7681],
  Nakagyo: [35.011, 135.7635],
  Shimogyo: [34.9878, 135.7594],
  Sakyo: [35.0271, 135.7947],
  "Kamo River": [35.0116, 135.7727],

  // ── ฟุกุโอกะ 福岡 ──
  Hakata: [33.5897, 130.4207],
  Tenjin: [33.5914, 130.3986],
  Nakasu: [33.5931, 130.4058],
  Chuo: [33.5847, 130.3907], // Ohori Park area

  // ── นาโกย่า 名古屋 ──
  "Nagoya Station": [35.1706, 136.8816],
  Meieki: [35.1706, 136.8816],
  Sakae: [35.1681, 136.9089],
  "Sakae / Meieki": [35.1681, 136.9089],
  Atsuta: [35.1279, 136.9086],

  // ── ซัปโปโร 札幌 ──
  Susukino: [43.0554, 141.3536],
  Odori: [43.0606, 141.3565],
  Kita: [43.0686, 141.3508],

  // ── โกเบ 神戸 ──
  Sannomiya: [34.6946, 135.1954],
  Harborland: [34.6789, 135.1786],
  Motomachi: [34.6889, 135.1875],

  // ── โยโกฮามะ 横浜 ──
  "Minato Mirai": [35.457, 139.6318],
  Naka: [35.4437, 139.6425],

  // ── โอกินาว่า 沖縄 ──
  Makishi: [26.2146, 127.6902],
  Naminoue: [26.2197, 127.6673],
  Shuri: [26.2173, 127.7195],

  // ── ฮาโกเน่ 箱根 ──
  "Hakone-Yumoto": [35.2324, 139.1069],
  Gora: [35.2469, 139.0508],
  "Moto-Hakone": [35.2016, 139.0244],
};

/**
 * คืนพิกัดกลางย่าน. ไม่พบในตาราง → fallback = city center (ปลอดภัยเสมอ).
 * area มาจาก Recommendation.area โดยตรง — trim ให้กันช่องว่างท้าย.
 */
export function getAreaCoord(area: string | undefined, cityCenter: LatLon): LatLon {
  if (!area) return cityCenter;
  return AREA_COORDS[area] ?? AREA_COORDS[area.trim()] ?? cityCenter;
}

export function hasAreaCoord(area: string | undefined): boolean {
  if (!area) return false;
  return area in AREA_COORDS || area.trim() in AREA_COORDS;
}
