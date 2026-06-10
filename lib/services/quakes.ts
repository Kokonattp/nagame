import { cached } from "@/lib/utils/cache";

export type QuakeItem = {
  time: string;
  place: string;
  magnitude: number | null;
  shindo: string | null;
  distanceKm: number | null;
  tsunami: boolean;
};

export type QuakeSignal = {
  available: boolean;
  items: QuakeItem[];
  updatedAt: string;
  message?: string;
};

type P2PQuakeRecord = {
  code?: number;
  earthquake?: {
    time?: string;
    maxScale?: number;
    domesticTsunami?: string;
    hypocenter?: {
      name?: string;
      latitude?: number;
      longitude?: number;
      magnitude?: number;
    };
  };
};

const NEARBY_RADIUS_KM = 350;
const STRONG_SCALE = 45; // ตั้งแต่ระดับ 5弱 ขึ้นไปแสดงแม้อยู่ไกล
const WINDOW_HOURS = 72;

// P2PQuake แปลง JMA seismic intensity เป็น scale x10
const SHINDO_LABELS: Record<number, string> = {
  10: "1",
  20: "2",
  30: "3",
  40: "4",
  45: "5 อ่อน",
  50: "5 แรง",
  55: "6 อ่อน",
  60: "6 แรง",
  70: "7",
};

export async function getQuakes(lat: number, lon: number): Promise<QuakeSignal> {
  const records = await cached("quakes:history", 60 * 5, fetchQuakeHistory);

  if (!records) {
    return {
      available: false,
      items: [],
      updatedAt: new Date().toISOString(),
      message: "ยังเชื่อมต่อข้อมูลแผ่นดินไหวไม่ได้ในตอนนี้",
    };
  }

  const cutoff = Date.now() - WINDOW_HOURS * 60 * 60 * 1000;
  const items = records
    .map((record) => toQuakeItem(record, lat, lon))
    .filter((item): item is NonNullable<ReturnType<typeof toQuakeItem>> => Boolean(item))
    .filter((item) => item.timestamp >= cutoff)
    .filter(
      (item) =>
        (item.distanceKm !== null && item.distanceKm <= NEARBY_RADIUS_KM) ||
        (item.rawScale ?? 0) >= STRONG_SCALE,
    )
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 3)
    .map((item) => ({
      time: item.time,
      place: item.place,
      magnitude: item.magnitude,
      shindo: item.shindo,
      distanceKm: item.distanceKm,
      tsunami: item.tsunami,
    }));

  return {
    available: true,
    items,
    updatedAt: new Date().toISOString(),
  };
}

async function fetchQuakeHistory(): Promise<P2PQuakeRecord[] | null> {
  try {
    const response = await fetch("https://api.p2pquake.net/v2/history?codes=551&limit=50", {
      headers: { "User-Agent": "Nagame/1.0 travel companion" },
      next: { revalidate: 300 },
    });

    if (!response.ok) return null;
    return (await response.json()) as P2PQuakeRecord[];
  } catch {
    return null;
  }
}

function toQuakeItem(record: P2PQuakeRecord, lat: number, lon: number) {
  const quake = record.earthquake;
  if (!quake?.time) return null;

  const timestamp = Date.parse(`${quake.time.replace(/\//g, "-").replace(" ", "T")}+09:00`);
  if (!Number.isFinite(timestamp)) return null;

  const hypocenter = quake.hypocenter;
  const hasCoords =
    typeof hypocenter?.latitude === "number" &&
    typeof hypocenter?.longitude === "number" &&
    hypocenter.latitude > -90; // P2PQuake ใช้ -200 แทนค่าไม่ทราบ

  return {
    timestamp,
    rawScale: quake.maxScale ?? 0,
    time: quake.time,
    place: hypocenter?.name || "ไม่ระบุจุดศูนย์กลาง",
    magnitude: typeof hypocenter?.magnitude === "number" && hypocenter.magnitude >= 0 ? hypocenter.magnitude : null,
    shindo: SHINDO_LABELS[quake.maxScale ?? -1] ?? null,
    distanceKm: hasCoords ? Math.round(haversineKm(lat, lon, hypocenter.latitude!, hypocenter.longitude!)) : null,
    tsunami: Boolean(quake.domesticTsunami && !["None", "Unknown", "Checking"].includes(quake.domesticTsunami)),
  };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
