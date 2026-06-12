import { cached } from "@/lib/utils/cache";

export type PoiItem = {
  title: string;
  extract: string | null;
  thumbnail: string | null;
  lat: number;
  lon: number;
  distanceKm: number;
  wikiUrl: string;
};

export type PoiSignal = {
  available: boolean;
  source: string;
  items: PoiItem[];
  updatedAt: string;
  message?: string;
};

type GeoSearchResponse = {
  query?: {
    geosearch?: {
      pageid: number;
      title: string;
      lat: number;
      lon: number;
      dist: number;
    }[];
  };
};

type PageDetailResponse = {
  query?: {
    pages?: Record<
      string,
      {
        pageid: number;
        title: string;
        extract?: string;
        thumbnail?: { source?: string };
      }
    >;
  };
};

// ชื่อบทความที่ไม่ใช่จุดเที่ยว — สถานี โรงเรียน หน่วยงาน เส้นทางรถไฟ ฯลฯ
const EXCLUDE_PATTERN =
  /\b(station|railway|line|school|university|college|hospital|airport|expressway|interchange|ward|district|prefecture|city hall|government|company|corporation|bank|broadcasting|stadium|depot|bypass|junior|elementary|kindergarten|police|fire department|post office|court|tunnel|substation|hotel)\b|^List of|, [A-Z]/i;

export async function getWikiPois(lat: number, lon: number, cityName: string): Promise<PoiSignal> {
  return cached(`pois:${lat.toFixed(3)}:${lon.toFixed(3)}`, 60 * 60 * 24, async () => {
    try {
      const geoUrl = new URL("https://en.wikipedia.org/w/api.php");
      geoUrl.searchParams.set("action", "query");
      geoUrl.searchParams.set("list", "geosearch");
      geoUrl.searchParams.set("gscoord", `${lat}|${lon}`);
      geoUrl.searchParams.set("gsradius", "10000");
      geoUrl.searchParams.set("gslimit", "40");
      geoUrl.searchParams.set("format", "json");

      const geoResponse = await fetch(geoUrl, {
        headers: { "User-Agent": "Nagame/1.0 travel companion" },
        next: { revalidate: 86400 },
      });
      if (!geoResponse.ok) throw new Error("GeoSearch unavailable");

      const geoData = (await geoResponse.json()) as GeoSearchResponse;
      const places = (geoData.query?.geosearch ?? [])
        .filter((place) => place.title.toLowerCase() !== cityName.toLowerCase())
        .filter((place) => !EXCLUDE_PATTERN.test(place.title))
        .slice(0, 12);

      if (!places.length) {
        return emptySignal("ยังไม่พบจุดที่น่าสนใจรอบเมืองนี้จาก Wikipedia");
      }

      const detailUrl = new URL("https://en.wikipedia.org/w/api.php");
      detailUrl.searchParams.set("action", "query");
      detailUrl.searchParams.set("pageids", places.map((place) => place.pageid).join("|"));
      detailUrl.searchParams.set("prop", "extracts|pageimages");
      detailUrl.searchParams.set("exintro", "1");
      detailUrl.searchParams.set("explaintext", "1");
      detailUrl.searchParams.set("exlimit", "max");
      detailUrl.searchParams.set("piprop", "thumbnail");
      detailUrl.searchParams.set("pithumbsize", "640");
      detailUrl.searchParams.set("format", "json");

      const detailResponse = await fetch(detailUrl, {
        headers: { "User-Agent": "Nagame/1.0 travel companion" },
        next: { revalidate: 86400 },
      });
      const detailData = detailResponse.ok ? ((await detailResponse.json()) as PageDetailResponse) : null;
      const pages = detailData?.query?.pages ?? {};

      const items: PoiItem[] = places
        .map((place) => {
          const detail = pages[String(place.pageid)];
          const extract = detail?.extract?.trim() ?? null;
          return {
            title: place.title,
            extract: extract ? truncate(extract, 180) : null,
            thumbnail: detail?.thumbnail?.source ?? null,
            lat: place.lat,
            lon: place.lon,
            distanceKm: Math.round((place.dist / 1000) * 10) / 10,
            wikiUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(place.title.replace(/ /g, "_"))}`,
          };
        })
        // เรียงรูปขึ้นก่อนแล้วตามระยะ — การ์ดที่มีรูปช่วยให้ตัดสินใจเร็วกว่า
        .sort((a, b) => Number(Boolean(b.thumbnail)) - Number(Boolean(a.thumbnail)) || a.distanceKm - b.distanceKm)
        .slice(0, 9);

      return {
        available: items.length > 0,
        source: "Wikipedia GeoSearch",
        items,
        updatedAt: new Date().toISOString(),
      };
    } catch {
      return emptySignal("ยังดึงข้อมูลสถานที่จาก Wikipedia ไม่ได้ในตอนนี้");
    }
  });
}

function emptySignal(message: string): PoiSignal {
  return {
    available: false,
    source: "Wikipedia GeoSearch",
    items: [],
    updatedAt: new Date().toISOString(),
    message,
  };
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max).replace(/\s+\S*$/, "")}…`;
}
