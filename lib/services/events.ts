import type { CityConfig } from "@/lib/cities/city-configs";
import { cached } from "@/lib/utils/cache";

export type EventSignal = {
  available: boolean;
  source: string;
  items: {
    title: string;
    url: string;
  }[];
  updatedAt: string;
  message?: string;
};

export async function getEvents(cityConfig?: CityConfig): Promise<EventSignal> {
  const key = cityConfig?.slug ?? "unknown";

  return cached(`events:${key}`, 60 * 30, async () => {
    if (!cityConfig?.eventLinks?.length) {
      return {
        available: false,
        source: "Unavailable",
        items: [],
        updatedAt: new Date().toISOString(),
        message: "ยังไม่ได้ตั้งค่า RSS/events สำหรับเมืองนี้",
      };
    }

    return {
      available: true,
      source: "Curated event links",
      items: cityConfig.eventLinks,
      updatedAt: new Date().toISOString(),
    };
  });
}
