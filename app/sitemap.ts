import type { MetadataRoute } from "next";
import { cityConfigs } from "@/lib/cities/city-configs";

const BASE_URL = "https://nagame.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    ...cityConfigs.map((city) => ({
      url: `${BASE_URL}/city/${city.slug}`,
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
  ];
}
