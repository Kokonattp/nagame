type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
) {
  const now = Date.now();
  const hit = memoryCache.get(key);

  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }

  const value = await loader();
  memoryCache.set(key, {
    value,
    expiresAt: now + ttlSeconds * 1000,
  });
  return value;
}

export function cacheHeaders(ttlSeconds = 1800) {
  return {
    "Cache-Control": `public, s-maxage=${ttlSeconds}, stale-while-revalidate=${ttlSeconds}`,
  };
}
