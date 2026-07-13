type CityImageInput = {
  slug: string;
  name: string;
  prefecture?: string;
  japaneseName?: string;
};

type PlaceImageInput = {
  title: string;
  area?: string;
};

type WikipediaPage = {
  title?: string;
  index?: number;
  thumbnail?: { source?: string };
};

type WikipediaImageResponse = {
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages?: Record<string, WikipediaPage>;
  };
};

const DAY_SECONDS = 60 * 60 * 24;
const SEARCH_FALLBACK_LIMIT = 10;

// Cache ของผลรูป (รวมค่า null = "หาแล้วไม่มี") — ความล้มเหลวชั่วคราว เช่น 429 จะไม่ถูกเขียนลง cache
const imageCache = new Map<string, { value: string | null; expiresAt: number }>();

function readImageCache(key: string): string | null | undefined {
  const hit = imageCache.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt < Date.now()) {
    imageCache.delete(key);
    return undefined;
  }
  return hit.value;
}

function writeImageCache(key: string, value: string | null, ttlSeconds = DAY_SECONDS) {
  imageCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const WIKI_MIN_GAP_MS = 300;
const WIKI_RETRY_DELAY_MS = 2000;

let wikiQueue: Promise<unknown> = Promise.resolve();
let lastWikiCallAt = 0;

async function rawWikipediaCall(params: Record<string, string>): Promise<WikipediaImageResponse> {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("prop", "pageimages");
  url.searchParams.set("piprop", "thumbnail");
  url.searchParams.set("pithumbsize", "900");
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Nagame/1.0 travel companion",
    },
    next: { revalidate: 86400 },
  });

  if (!response.ok) throw new Error(`Wikipedia ${response.status}`);
  return (await response.json()) as WikipediaImageResponse;
}

// คำขอทั้งหมดเข้าคิวเดียว เว้นจังหวะขั้นต่ำ และ retry หนึ่งครั้งเมื่อเจอ 429
function callWikipedia(params: Record<string, string>): Promise<WikipediaImageResponse> {
  const run = async () => {
    const wait = lastWikiCallAt + WIKI_MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);

    try {
      return await rawWikipediaCall(params);
    } catch (error) {
      if (error instanceof Error && error.message.includes("429")) {
        await sleep(WIKI_RETRY_DELAY_MS);
        return await rawWikipediaCall(params);
      }
      throw error;
    } finally {
      lastWikiCallAt = Date.now();
    }
  };

  const next = wikiQueue.then(run, run);
  wikiQueue = next.catch(() => undefined);
  return next;
}

// ขอรูปจากหลาย title ในคำขอเดียว (สูงสุด 50 title) เพื่อเลี่ยง rate limit รายคำขอ
async function fetchImagesByExactTitles(titles: string[]): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>(titles.map((title) => [title, null]));
  if (!titles.length) return result;

  const data = await callWikipedia({
    redirects: "1",
    titles: titles.join("|"),
  });

  const hops = new Map<string, string>();
  [...(data.query?.normalized ?? []), ...(data.query?.redirects ?? [])].forEach((pair) => {
    hops.set(pair.from, pair.to);
  });
  const resolveTitle = (title: string) => {
    let current = title;
    for (let i = 0; i < 5; i += 1) {
      const next = hops.get(current);
      if (!next) break;
      current = next;
    }
    return current;
  };

  const imageByTitle = new Map<string, string | null>();
  Object.values(data.query?.pages ?? {}).forEach((page) => {
    if (page.title) imageByTitle.set(page.title, page.thumbnail?.source ?? null);
  });

  titles.forEach((title) => {
    result.set(title, imageByTitle.get(resolveTitle(title)) ?? null);
  });
  return result;
}

async function searchWikipediaImages(search: string): Promise<{ title: string; image: string }[]> {
  const data = await callWikipedia({
    generator: "search",
    gsrsearch: search,
    gsrlimit: "3",
    gsrnamespace: "0",
  });

  return Object.values(data.query?.pages ?? {})
    .sort((a, b) => (a.index ?? 99) - (b.index ?? 99))
    .filter((page): page is WikipediaPage & { title: string } => Boolean(page.title && page.thumbnail?.source))
    .map((page) => ({ title: page.title, image: page.thumbnail!.source! }));
}

// ตัดคำห้อยทั่วไปอย่าง "base" / "area" ออกจากชื่อสถานที่ก่อนนำไปค้น
function cleanPlaceTitle(title: string) {
  return title
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s+\b(base|stay|zone|area|corner|floor)\b\s*$/i, "")
    .trim();
}

const MATCH_STOP_WORDS = new Set(["the", "and", "for", "near", "around", "from", "with", "ward"]);

function normalizeForMatch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function meaningfulTokens(value: string, cityName: string) {
  const cityTokens = new Set(normalizeForMatch(cityName).split(/[^a-z0-9]+/));
  return normalizeForMatch(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !MATCH_STOP_WORDS.has(token) && !cityTokens.has(token));
}

// รับรูปเฉพาะเมื่อชื่อบทความตรงกับชื่อสถานที่อย่างน้อยครึ่งหนึ่งของคำสำคัญ
// กันเคสที่คำย่านอย่าง "Hakata" คำเดียวลากรูปคนละสถานที่มา
function titlesOverlap(pageTitle: string, placeTitle: string, cityName: string) {
  const placeTokens = [...new Set(meaningfulTokens(placeTitle, cityName))];
  if (!placeTokens.length) return false;
  const pageTokens = new Set(meaningfulTokens(pageTitle, cityName));
  const matches = placeTokens.filter((token) => pageTokens.has(token)).length;
  return matches * 2 >= placeTokens.length;
}

export async function getCityHeroImagesBulk(inputs: CityImageInput[]) {
  const results = new Map<string, string | null>();
  let pending: CityImageInput[] = [];

  for (const input of inputs) {
    const hit = readImageCache(`city-image:${input.slug}`);
    if (hit !== undefined) results.set(input.slug, hit);
    else pending.push(input);
  }
  if (!pending.length) return results;

  const candidateRounds: ((input: CityImageInput) => string)[] = [
    (input) => input.name,
    (input) => (input.prefecture ? `${input.name}, ${input.prefecture}` : `${input.name}, Japan`),
    (input) => `${input.name}, Japan`,
  ];

  try {
    for (const round of candidateRounds) {
      if (!pending.length) break;
      const titles = [...new Set(pending.map(round))];
      const found = await fetchImagesByExactTitles(titles);
      const stillPending: CityImageInput[] = [];

      for (const input of pending) {
        const image = found.get(round(input)) ?? null;
        if (image) {
          results.set(input.slug, image);
          writeImageCache(`city-image:${input.slug}`, image);
        } else {
          stillPending.push(input);
        }
      }
      pending = stillPending;
    }

    pending.forEach((input) => {
      results.set(input.slug, null);
      writeImageCache(`city-image:${input.slug}`, null);
    });
  } catch {
    pending.forEach((input) => {
      if (!results.has(input.slug)) results.set(input.slug, null);
    });
  }

  return results;
}

export async function getCityHeroImage(input: CityImageInput) {
  const results = await getCityHeroImagesBulk([input]);
  return results.get(input.slug) ?? null;
}

type PlaceImageOptions = {
  // ข้ามรอบสอง (fuzzy search ทีละรายการ สูงสุด 10 call เว้น 300ms ต่อ call)
  // ใช้ตอน server render เพื่อไม่ให้รูป "nice to have" ไป block การโหลดหน้า —
  // รอบแรก (batch 1 call) ยังทำงาน รูปหลักยังมา. ค่า default = ทำครบเหมือนเดิม
  // เพื่อไม่ให้จุดเรียกอื่นเปลี่ยนพฤติกรรม.
  skipFuzzyFallback?: boolean;
};

export async function getPlaceImages(
  cityName: string,
  items: PlaceImageInput[],
  options: PlaceImageOptions = {},
): Promise<(string | null)[]> {
  const keyOf = (item: PlaceImageInput) => `place-image:${cityName}:${item.title}`.toLowerCase();
  const results: (string | null)[] = new Array(items.length).fill(null);
  let pendingIndexes: number[] = [];

  items.forEach((item, index) => {
    const hit = readImageCache(keyOf(item));
    if (hit !== undefined) results[index] = hit;
    else pendingIndexes.push(index);
  });
  if (!pendingIndexes.length) return results;

  // รอบแรก: เทียบชื่อสถานที่ตรง ๆ ทั้งชุดในคำขอเดียว
  try {
    const titles = [...new Set(pendingIndexes.map((index) => cleanPlaceTitle(items[index].title)))];
    const found = await fetchImagesByExactTitles(titles);
    const stillPending: number[] = [];

    for (const index of pendingIndexes) {
      const image = found.get(cleanPlaceTitle(items[index].title)) ?? null;
      if (image) {
        results[index] = image;
        writeImageCache(keyOf(items[index]), image);
      } else {
        stillPending.push(index);
      }
    }
    pendingIndexes = stillPending;
  } catch {
    return results;
  }

  // รอบสอง: ค้นหาแบบ fuzzy ทีละรายการ และรับเฉพาะหน้าที่ชื่อสอดคล้องกับสถานที่จริง
  // ข้ามได้ตอน server render — รอบนี้ยิงได้ถึง 10 call เว้น 300ms = คอขวดหลักของหน้า
  if (options.skipFuzzyFallback) return results;
  for (const index of pendingIndexes.slice(0, SEARCH_FALLBACK_LIMIT)) {
    try {
      const item = items[index];
      const cleaned = cleanPlaceTitle(item.title);
      const candidates = await searchWikipediaImages(`${cleaned} ${cityName}`);
      const image = candidates.find((candidate) => titlesOverlap(candidate.title, cleaned, cityName))?.image ?? null;

      results[index] = image;
      writeImageCache(keyOf(item), image);
    } catch {
      break;
    }
  }

  return results;
}
