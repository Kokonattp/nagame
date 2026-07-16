import { cached } from "@/lib/utils/cache";
import { getFx } from "@/lib/services/fx";

// stays — ที่พักจาก Rakuten Travel API (ทางการ ห้าม reverse) + affiliate deep-link.
// ตาม docs/chat-cards-roadmap.md Phase 1: StayCard มีราคา/คืน (แปลงเป็นบาท) + ปุ่มจองผ่าน outbound.
//
// dual-mode เหมือนทั้งระบบ: ไม่มี RAKUTEN_APP_ID → available:false, ไม่มี card, ไม่พัง.
// ราคาห้องเปลี่ยนช้า → cache ยาว (6 ชม). เจ้าของสมัคร app id ที่ https://webservice.rakuten.co.jp/
// แล้วใส่ env RAKUTEN_APP_ID (+ RAKUTEN_AFFILIATE_ID ถ้ามี) เปิดใช้ได้ทันที.

export type StayOffer = {
  name: string;
  area?: string;
  /** ราคา/คืน แปลงเป็นบาทแล้ว (null ถ้าไม่มีข้อมูลราคา) */
  pricePerNightThb: number | null;
  rating: number | null;
  imageUrl: string | null;
  /** URL ต้นทาง Rakuten (ยังไม่ห่อ outbound — advisor จะห่อตอนประกอบ card) */
  bookingUrl: string;
};

export type StaySignal = {
  available: boolean;
  source: string;
  items: StayOffer[];
  updatedAt: string;
  message?: string;
};

const CACHE_SECONDS = 60 * 60 * 6; // ราคาห้องเปลี่ยนช้า

// โครงย่อยของ Rakuten SimpleHotelSearch response ที่เราใช้ (ไม่ครบทุก field)
type RakutenHotel = {
  hotel?: {
    hotelBasicInfo?: {
      hotelName?: string;
      hotelInformationUrl?: string;
      hotelImageUrl?: string;
      hotelMinCharge?: number; // เยน
      reviewAverage?: number;
      address1?: string;
      address2?: string;
    };
  }[];
};

type RakutenResponse = {
  hotels?: RakutenHotel[];
  error?: string;
};

function empty(message: string): StaySignal {
  return { available: false, source: "Rakuten Travel", items: [], updatedAt: new Date().toISOString(), message };
}

// ค้นที่พักรอบพิกัดเมือง — Rakuten SimpleHotelSearch (searchRadius กม.).
export async function getStays(lat: number, lon: number): Promise<StaySignal> {
  const appId = process.env.RAKUTEN_APP_ID;
  if (!appId) return empty("ยังไม่ได้ตั้งค่า Rakuten (ที่พักจะแสดงเมื่อใส่ RAKUTEN_APP_ID)");

  return cached(`stays:${lat.toFixed(3)}:${lon.toFixed(3)}`, CACHE_SECONDS, async () => {
    try {
      const fx = await getFx(); // อัตราแปลงเยน→บาท (มี fallback ในตัว)
      // fx ให้ thbPer100Jpy → บาทต่อ 1 เยน = หาร 100
      const yenToThb = fx.available && typeof fx.thbPer100Jpy === "number" ? fx.thbPer100Jpy / 100 : null;

      const url = new URL("https://app.rakuten.co.jp/services/api/Travel/SimpleHotelSearch/20170426");
      url.searchParams.set("applicationId", appId);
      if (process.env.RAKUTEN_AFFILIATE_ID) url.searchParams.set("affiliateId", process.env.RAKUTEN_AFFILIATE_ID);
      url.searchParams.set("format", "json");
      url.searchParams.set("latitude", String(lat));
      url.searchParams.set("longitude", String(lon));
      url.searchParams.set("searchRadius", "3"); // กม. (Rakuten รับ 0.1–3)
      url.searchParams.set("datumType", "1"); // WGS84 (lat/lon แบบสากล)
      url.searchParams.set("hits", "10");
      url.searchParams.set("responseType", "small");

      const response = await fetch(url, { next: { revalidate: CACHE_SECONDS } });
      if (!response.ok) return empty("ยังดึงที่พักจาก Rakuten ไม่ได้ในตอนนี้");

      const data = (await response.json()) as RakutenResponse;
      if (data.error || !data.hotels?.length) return empty("ยังไม่พบที่พักรอบเมืองนี้จาก Rakuten");

      const items: StayOffer[] = data.hotels
        .map((entry) => entry.hotel?.[0]?.hotelBasicInfo)
        .filter((info): info is NonNullable<typeof info> => Boolean(info?.hotelName && info?.hotelInformationUrl))
        .map((info) => {
          const yen = typeof info.hotelMinCharge === "number" ? info.hotelMinCharge : null;
          return {
            name: info.hotelName!,
            area: [info.address1, info.address2].filter(Boolean).join("") || undefined,
            // แปลงเยน→บาท ถ้าได้ fx; ไม่งั้น null (การ์ดยังโชว์ได้ แค่ไม่มีราคา)
            pricePerNightThb: yen != null && yenToThb != null ? Math.round(yen * yenToThb) : null,
            rating: typeof info.reviewAverage === "number" ? info.reviewAverage : null,
            imageUrl: info.hotelImageUrl ?? null,
            bookingUrl: info.hotelInformationUrl!,
          };
        })
        // เรียงราคา (ถูกก่อน) — null ราคาไปท้าย
        .sort((a, b) => (a.pricePerNightThb ?? Infinity) - (b.pricePerNightThb ?? Infinity));

      if (!items.length) return empty("ยังไม่พบที่พักรอบเมืองนี้จาก Rakuten");

      return { available: true, source: "Rakuten Travel", items, updatedAt: new Date().toISOString() };
    } catch {
      return empty("ยังดึงที่พักจาก Rakuten ไม่ได้ในตอนนี้");
    }
  });
}
