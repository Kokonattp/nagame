import { NextRequest, NextResponse } from "next/server";

// /api/tabi/image?title=<English Wikipedia title> → 302 to the page's lead image on
// upload.wikimedia.org. Free, no key. 404 when the page has no image (cards fall
// back to a colour block). UI shows "ภาพ: Wikipedia" credit next to these images.
// A lead image that is a logo, emblem, seal, flag or map (or any SVG drawing) is not a photo of the
// place: then the optional &fallback=<title> (usually the city) is tried instead.

export const revalidate = 604800; // a week — lead images rarely change

const UA = "nagame-tabi/0.1 (https://nagame.vercel.app)";

export async function GET(request: NextRequest) {
  const fallback = request.nextUrl.searchParams.get("fallback")?.trim();
  const title = request.nextUrl.searchParams.get("title")?.trim() || fallback;
  if (!title || title.length > 200) return new NextResponse(null, { status: 404 });
  const src = (await leadPhoto(title)) ?? (fallback && fallback.length <= 200 ? await leadPhoto(fallback) : null);
  return src ? NextResponse.redirect(src, 302) : new NextResponse(null, { status: 404 });
}

const NOT_A_PHOTO = /\.svg|logo|emblem|seal|crest|coat_of_arms|symbol|flag|insignia|wordmark|signature|locator|location_map|map_of|_map\./i;

async function leadPhoto(title: string): Promise<string | null> {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=pageimages" +
    `&piprop=thumbnail&pithumbsize=640&redirects=1&titles=${encodeURIComponent(title)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, next: { revalidate } });
    if (!res.ok) return null;
    const data = (await res.json()) as { query?: { pages?: { thumbnail?: { source?: string } }[] } };
    const src = data.query?.pages?.[0]?.thumbnail?.source;
    // Wikipedia serves thumbnails from upload.* or thumb.wikimedia.org — accept only Wikimedia hosts.
    if (!src || !isWikimedia(src) || NOT_A_PHOTO.test(decodeURIComponent(src))) return null;
    return src;
  } catch {
    return null;
  }
}

function isWikimedia(src: string) {
  try {
    const u = new URL(src);
    return u.protocol === "https:" && (u.hostname === "wikimedia.org" || u.hostname.endsWith(".wikimedia.org"));
  } catch {
    return false;
  }
}
