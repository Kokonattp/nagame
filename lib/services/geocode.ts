import { getCityConfigByName } from "@/lib/cities/city-configs";
import { findJapanCitySeed } from "@/lib/cities/japan-major-cities";
import { cached } from "@/lib/utils/cache";
import { slugifyCity, toTitleCase } from "@/lib/utils/format";

export type ResolvedCity = {
  name: string;
  slug: string;
  japaneseName?: string;
  prefecture?: string;
  lat: number;
  lon: number;
  source: "config" | "seed" | "geocode";
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    province?: string;
  };
};

export async function resolveCity(query: string): Promise<ResolvedCity | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const config = getCityConfigByName(trimmed);
  if (config) {
    return {
      name: config.name,
      japaneseName: config.japaneseName,
      prefecture: config.prefecture,
      slug: config.slug,
      lat: config.lat,
      lon: config.lon,
      source: "config",
    };
  }

  const seed = findJapanCitySeed(trimmed);
  if (seed) {
    return {
      name: seed.name,
      japaneseName: seed.japaneseName,
      prefecture: seed.prefecture,
      slug: seed.slug,
      lat: seed.lat,
      lon: seed.lon,
      source: "seed",
    };
  }

  return cached(`geocode:${slugifyCity(trimmed)}`, 60 * 60 * 24, async () => {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", `${trimmed}, Japan`);
    url.searchParams.set("countrycodes", "jp");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "1");

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Nagame/1.0 travel signal app",
        },
        next: { revalidate: 86400 },
      });

      if (!response.ok) return null;
      const results = (await response.json()) as NominatimResult[];
      const first = results[0];
      if (!first) return null;

      const cityName =
        first.address?.city ??
        first.address?.town ??
        first.address?.village ??
        first.address?.municipality ??
        first.name ??
        toTitleCase(trimmed);

      return {
        name: cityName,
        prefecture: first.address?.state ?? first.address?.province,
        slug: slugifyCity(cityName || trimmed),
        lat: Number(first.lat),
        lon: Number(first.lon),
        source: "geocode",
      };
    } catch {
      return null;
    }
  });
}
