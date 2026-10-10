import type { MetadataRoute } from "next";
import { cityConfigs } from "@/lib/cities/city-configs";
import { MONTHS } from "@/lib/tabi/months";

const BASE_URL = "https://nagame.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/japan`, changeFrequency: "monthly", priority: 0.9 },
    ...MONTHS.map((m) => ({ url: `${BASE_URL}/japan/${m.slug}`, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...cityConfigs.map((city) => ({
      url: `${BASE_URL}/city/${city.slug}`,
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
  ];
}
