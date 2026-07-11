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

type GeneratorResponse = {
  query?: {
    pages?: Record<
      string,
      {
        pageid: number;
        title: string;
        extract?: string;
        thumbnail?: { source?: string };
        coordinates?: { lat: number; lon: number; dist?: number }[];
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
      // generator=geosearch รวมค้นหา+รายละเอียดในคำขอเดียว (เดิมยิง 2 รอบต่อกัน)
      // ggslimit 20 = เพดาน exlimit ของ extracts ต่อคำขอพอดี
      const url = new URL("https://en.wikipedia.org/w/api.php");
      url.searchParams.set("action", "query");
      url.searchParams.set("generator", "geosearch");
      url.searchParams.set("ggscoord", `${lat}|${lon}`);
      url.searchParams.set("ggsradius", "10000");
      url.searchParams.set("ggslimit", "20");
      url.searchParams.set("prop", "extracts|pageimages|coordinates");
      url.searchParams.set("exintro", "1");
      url.searchParams.set("explaintext", "1");
      url.searchParams.set("exlimit", "max");
      url.searchParams.set("piprop", "thumbnail");
      url.searchParams.set("pithumbsize", "640");
      url.searchParams.set("codistancefrompoint", `${lat}|${lon}`);
      url.searchParams.set("format", "json");

      const response = await fetch(url, {
        headers: { "User-Agent": "Nagame/1.0 travel companion" },
        next: { revalidate: 86400 },
      });
      if (!response.ok) throw new Error("GeoSearch unavailable");

      const data = (await response.json()) as GeneratorResponse;
      const pages = Object.values(data.query?.pages ?? {});

      const items: PoiItem[] = pages
        .filter((page) => page.title.toLowerCase() !== cityName.toLowerCase())
        .filter((page) => !EXCLUDE_PATTERN.test(page.title))
        .filter((page) => page.coordinates?.[0])
        .map((page) => {
          const coords = page.coordinates![0];
          const extract = page.extract?.trim() ?? null;
          return {
            title: page.title,
            extract: extract ? truncate(extract, 180) : null,
            thumbnail: page.thumbnail?.source ?? null,
            lat: coords.lat,
            lon: coords.lon,
            distanceKm: Math.round(((coords.dist ?? 0) / 1000) * 10) / 10,
            wikiUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
          };
        })
        // เรียงรูปขึ้นก่อนแล้วตามระยะ — การ์ดที่มีรูปช่วยให้ตัดสินใจเร็วกว่า
        .sort((a, b) => Number(Boolean(b.thumbnail)) - Number(Boolean(a.thumbnail)) || a.distanceKm - b.distanceKm)
        .slice(0, 9);

      if (!items.length) {
        return emptySignal("ยังไม่พบจุดที่น่าสนใจรอบเมืองนี้จาก Wikipedia");
      }

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
