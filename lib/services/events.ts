import type { CityConfig } from "@/lib/cities/city-configs";
import { cached } from "@/lib/utils/cache";

export type EventSignal = {
  available: boolean;
  source: string;
  items: {
    title: string;
    url: string;
    source?: string;
    publishedAt?: string;
  }[];
  updatedAt: string;
  message?: string;
};

export async function getEvents(cityConfig?: CityConfig): Promise<EventSignal> {
  const key = cityConfig?.slug ?? "unknown";

  return cached(`events:${key}`, 60 * 30, async () => {
    const liveFeed = cityConfig ? await getGoogleNewsEvents(cityConfig.name) : null;
    if (liveFeed?.items.length) {
      return liveFeed;
    }

    if (cityConfig?.eventLinks?.length) {
      return {
        available: true,
        source: "Curated travel links",
        items: cityConfig.eventLinks.map((item) => ({
          title: item.title,
          url: item.url,
          source: "Curated",
        })),
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      available: false,
      source: "Unavailable",
      items: [],
      updatedAt: new Date().toISOString(),
      message: "ยังดึง RSS หรือข่าวกิจกรรมของเมืองนี้ไม่ได้ในตอนนี้",
    };
  });
}

async function getGoogleNewsEvents(cityName: string): Promise<EventSignal | null> {
  try {
    const url = new URL("https://news.google.com/rss/search");
    url.searchParams.set("q", `${cityName} Japan travel OR event OR festival when:7d`);
    url.searchParams.set("hl", "en-US");
    url.searchParams.set("gl", "US");
    url.searchParams.set("ceid", "US:en");

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Nagame/1.0 travel companion",
      },
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      throw new Error("Feed unavailable");
    }

    const xml = await response.text();
    const items = parseRssItems(xml)
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
      .slice(0, 8);

    return {
      available: items.length > 0,
      source: "Google News RSS",
      items,
      updatedAt: new Date().toISOString(),
      message: items.length ? undefined : "ยังไม่พบบทความหรือกิจกรรมใหม่จากฟีด",
    };
  } catch {
    return null;
  }
}

function parseRssItems(xml: string) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

  return items
    .map((match) => {
      const block = match[1];
      const title = readTag(block, "title");
      const url = readTag(block, "link");
      const source = readTag(block, "source");
      const publishedAt = readTag(block, "pubDate");

      if (!title || !url) return null;

      return {
        title: decodeEntity(title),
        url: decodeEntity(url),
        source: source ? decodeEntity(source) : undefined,
        publishedAt: publishedAt ? new Date(publishedAt).toISOString() : undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function readTag(block: string, tag: string) {
  const pattern = new RegExp(
    `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
  );
  const match = block.match(pattern);
  return match?.[1] ?? match?.[2] ?? null;
}

function decodeEntity(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
