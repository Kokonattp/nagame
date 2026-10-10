import { NextRequest, NextResponse } from "next/server";

// /api/tabi/image?title=<English Wikipedia title> → 302 to the page's lead image on
// upload.wikimedia.org. Free, no key. 404 when the page has no image (cards fall
// back to a colour block). UI shows "ภาพ: Wikipedia" credit next to these images.

export const revalidate = 604800; // a week — lead images rarely change

const UA = "nagame-tabi/0.1 (https://nagame.vercel.app)";

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get("title")?.trim();
  if (!title || title.length > 200) return new NextResponse(null, { status: 404 });

  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=pageimages" +
    `&piprop=thumbnail&pithumbsize=640&redirects=1&titles=${encodeURIComponent(title)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, next: { revalidate } });
    if (!res.ok) return new NextResponse(null, { status: 404 });
    const data = (await res.json()) as { query?: { pages?: { thumbnail?: { source?: string } }[] } };
    const src = data.query?.pages?.[0]?.thumbnail?.source;
    // Wikipedia serves thumbnails from upload.* or thumb.wikimedia.org — accept only Wikimedia hosts.
    if (!src || !isWikimedia(src)) return new NextResponse(null, { status: 404 });
    return NextResponse.redirect(src, 302);
  } catch {
    return new NextResponse(null, { status: 404 });
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
