import { cached } from "@/lib/utils/cache";

type CityImageInput = {
  slug: string;
  name: string;
  prefecture?: string;
  japaneseName?: string;
};

type WikipediaImageResponse = {
  query?: {
    pages?: Record<
      string,
      {
        original?: { source?: string };
        thumbnail?: { source?: string };
      }
    >;
  };
};

export async function getCityHeroImage(input: CityImageInput) {
  return cached(`city-image:${input.slug}`, 60 * 60 * 24, async () => {
    for (const title of buildCandidateTitles(input)) {
      const image = await fetchWikipediaImage(title);
      if (image) return image;
    }

    return null;
  });
}

async function fetchWikipediaImage(title: string) {
  try {
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("prop", "pageimages");
    url.searchParams.set("piprop", "original|thumbnail");
    url.searchParams.set("pithumbsize", "1600");
    url.searchParams.set("redirects", "1");
    url.searchParams.set("titles", title);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Nagame/1.0 travel companion",
      },
      next: { revalidate: 86400 },
    });

    if (!response.ok) return null;
    const data = (await response.json()) as WikipediaImageResponse;
    const pages = Object.values(data.query?.pages ?? {});
    const page = pages.find((item) => item.original?.source || item.thumbnail?.source);

    return page?.original?.source ?? page?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

function buildCandidateTitles({ name, prefecture, japaneseName }: CityImageInput) {
  return [
    `${name}`,
    prefecture ? `${name}, ${prefecture}` : null,
    `${name}, Japan`,
    prefecture ? `${name} ${prefecture}` : null,
    japaneseName ? `${name} (${japaneseName})` : null,
  ].filter((value): value is string => Boolean(value));
}
