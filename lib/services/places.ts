import { cached } from "@/lib/utils/cache";

// places — ร้านอาหารจาก Google Places API (Text Search) + filter บริบทคนไทย
// (ฮาลาล/มังสวิรัติ/แพ้กุ้ง). ตาม docs/chat-cards-roadmap.md Phase 1: EatCard จริง.
//
// dual-mode: ไม่มี GOOGLE_PLACES_API_KEY → available:false, ไม่มี card, ไม่พัง.
// เจ้าของเปิด Places API (New) ที่ Google Cloud แล้วใส่ env GOOGLE_PLACES_API_KEY.
// ใช้ Places API (New) v1 places:searchText — endpoint ทางการ ไม่ scrape.

export type DietFilter = "halal" | "vegetarian" | "no-shrimp";

export type EatPlace = {
  name: string;
  area?: string;
  cuisine?: string;
  rating: number | null;
  priceLevel: string | null; // "฿".."฿฿฿฿"
  imageUrl: string | null;
  /** ลิงก์ Google Maps (ยังไม่ห่อ outbound — advisor ห่อตอนประกอบ card) */
  mapUrl: string;
};

export type PlacesSignal = {
  available: boolean;
  source: string;
  items: EatPlace[];
  updatedAt: string;
  message?: string;
};

const CACHE_SECONDS = 60 * 60 * 12; // ร้าน/เรตติ้งเปลี่ยนช้า

// คำค้นเสริมตาม diet filter — ต่อท้าย query ให้ Places คืนร้านที่ตรงบริบทคนไทย
const DIET_QUERY: Record<DietFilter, string> = {
  halal: "halal",
  vegetarian: "vegetarian",
  "no-shrimp": "", // แพ้กุ้ง = ไม่ผูกกับ query, กรองประเภทซีฟู้ดออกด้านล่างแทน
};

const PRICE_SYMBOL: Record<string, string> = {
  PRICE_LEVEL_INEXPENSIVE: "฿",
  PRICE_LEVEL_MODERATE: "฿฿",
  PRICE_LEVEL_EXPENSIVE: "฿฿฿",
  PRICE_LEVEL_VERY_EXPENSIVE: "฿฿฿฿",
};

type PlacesApiPlace = {
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  priceLevel?: string;
  primaryTypeDisplayName?: { text?: string };
  types?: string[];
  photos?: { name?: string }[];
  googleMapsUri?: string;
  id?: string;
};

type PlacesApiResponse = {
  places?: PlacesApiPlace[];
  error?: { message?: string };
};

function empty(message: string): PlacesSignal {
  return { available: false, source: "Google Places", items: [], updatedAt: new Date().toISOString(), message };
}

export async function getEatPlaces(
  lat: number,
  lon: number,
  cityName: string,
  diet?: DietFilter,
): Promise<PlacesSignal> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return empty("ยังไม่ได้ตั้งค่า Google Places (ร้านจะแสดงเมื่อใส่ GOOGLE_PLACES_API_KEY)");

  const dietTag = diet ? DIET_QUERY[diet] : "";
  const query = `${dietTag} restaurants in ${cityName}`.trim();

  return cached(`places:${lat.toFixed(3)}:${lon.toFixed(3)}:${diet ?? "any"}`, CACHE_SECONDS, async () => {
    try {
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          // field mask บังคับใน Places API (New) — ขอเฉพาะที่ใช้ กัน quota บาน
          "X-Goog-FieldMask":
            "places.displayName,places.formattedAddress,places.rating,places.priceLevel,places.primaryTypeDisplayName,places.types,places.photos,places.googleMapsUri,places.id",
        },
        body: JSON.stringify({
          textQuery: query,
          locationBias: { circle: { center: { latitude: lat, longitude: lon }, radius: 4000 } },
          maxResultCount: 10,
          languageCode: "th",
        }),
        next: { revalidate: CACHE_SECONDS },
      });
      if (!response.ok) return empty("ยังดึงร้านจาก Google Places ไม่ได้ในตอนนี้");

      const data = (await response.json()) as PlacesApiResponse;
      if (data.error || !data.places?.length) return empty(`ยังไม่พบร้านใน ${cityName} จาก Google Places`);

      let places = data.places;
      // แพ้กุ้ง: กรองร้านที่ประเภทเป็นซีฟู้ด/ซูชิออก (ลดความเสี่ยง ไม่ใช่การันตี 100%)
      if (diet === "no-shrimp") {
        places = places.filter((p) => !(p.types ?? []).some((t) => /seafood|sushi/i.test(t)));
      }

      const items: EatPlace[] = places
        .filter((p) => p.displayName?.text && p.googleMapsUri)
        .map((p) => ({
          name: p.displayName!.text!,
          area: p.formattedAddress,
          cuisine: p.primaryTypeDisplayName?.text,
          rating: typeof p.rating === "number" ? p.rating : null,
          priceLevel: p.priceLevel ? (PRICE_SYMBOL[p.priceLevel] ?? null) : null,
          imageUrl: buildPhotoUrl(p.photos?.[0]?.name, key),
          mapUrl: p.googleMapsUri!,
        }))
        // เรตติ้งสูงก่อน (null ท้าย)
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

      if (!items.length) return empty(`ยังไม่พบร้านใน ${cityName} ตามเงื่อนไขนี้`);

      return { available: true, source: "Google Places", items, updatedAt: new Date().toISOString() };
    } catch {
      return empty("ยังดึงร้านจาก Google Places ไม่ได้ในตอนนี้");
    }
  });
}

// รูปจาก Places Photo endpoint — ต้องมี photo resource name + key
function buildPhotoUrl(photoName: string | undefined, key: string): string | null {
  if (!photoName) return null;
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=640&key=${key}`;
}
