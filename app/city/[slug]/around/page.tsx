import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExternalLink, Home } from "lucide-react";
import { getCityConfigBySlug } from "@/lib/cities/city-configs";
import { getNearbyCities } from "@/lib/cities/travel-meta";
import { getCityHeroImagesBulk } from "@/lib/services/city-images";
import { getEvents } from "@/lib/services/events";
import { resolveCity } from "@/lib/services/geocode";
import { getWikiPois } from "@/lib/services/pois";

// 10 นาที — ให้ข่าวใน feed ตามทันเหตุการณ์
export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const city = await resolveCity(slug);
  if (!city) return {};

  const title = `รอบเมือง ${city.name} | Nagame`;
  const description = `เมืองใกล้เคียงสำหรับ day trip จุดน่าสนใจรอบ ${city.name} และข่าวอีเวนต์ล่าสุด`;
  return { title, description, openGraph: { title, description, siteName: "Nagame", type: "website", locale: "th_TH" } };
}

export default async function CityAroundPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const city = await resolveCity(slug);

  if (!city) notFound();
  if (city.slug !== slug) redirect(`/city/${city.slug}/around`);

  const config = getCityConfigBySlug(city.slug);
  const nearbyBase = getNearbyCities(city.slug, city.lat, city.lon, 6);
  const [pois, events, heroImages] = await Promise.all([
    getWikiPois(city.lat, city.lon, city.name),
    getEvents(config),
    getCityHeroImagesBulk(
      nearbyBase
        .filter((nearby) => !nearby.heroImage)
        .map((nearby) => ({
          slug: nearby.slug,
          name: nearby.name,
          prefecture: nearby.prefecture,
          japaneseName: nearby.japaneseName,
        })),
    ),
  ]);
  const nearbyCities = nearbyBase.map((nearby) => ({
    ...nearby,
    heroImage: nearby.heroImage ?? heroImages.get(nearby.slug) ?? undefined,
  }));

  return (
    <main className="min-h-screen overflow-x-clip text-[var(--foreground)]">
      <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-8 px-4 pb-12 pt-4 md:px-8 md:pt-6 xl:px-10">
        <header className="rounded-[30px] border border-[var(--line)] bg-[rgba(255,251,245,0.84)] px-4 py-4 shadow-[0_14px_48px_rgba(31,36,48,0.06)] backdrop-blur-xl md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <Link
                href="/"
                className="inline-block text-[11px] font-medium uppercase tracking-[0.28em] text-[var(--accent-warm)] transition hover:text-[var(--accent)]"
              >
                Nagame Travel Companion
              </Link>
              <div className="flex flex-wrap items-end gap-3">
                <h1 className="font-serif text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
                  รอบเมือง {city.name}
                </h1>
                {city.japaneseName ? (
                  <p className="pb-1 font-serif text-xl text-[var(--accent-warm)] md:text-2xl">{city.japaneseName}</p>
                ) : null}
              </div>
            </div>
            <nav className="flex flex-wrap gap-2 text-sm text-[var(--ink-muted)]">
              <Link
                href={`/city/${city.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--accent)] px-4 py-2 text-[#faf7f2] transition hover:bg-[#1b2a39]"
              >
                <Home className="h-3.5 w-3.5" aria-hidden />
                กลับหน้า {city.name}
              </Link>
              <a href="#nearby" className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.72)] px-4 py-2 hover:border-[var(--line-strong)]">เมืองใกล้เคียง</a>
              <a href="#pois" className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.72)] px-4 py-2 hover:border-[var(--line-strong)]">จุดรอบเมือง</a>
              <a href="#news" className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.72)] px-4 py-2 hover:border-[var(--line-strong)]">ข่าว/อีเวนต์</a>
            </nav>
          </div>
        </header>

        <section id="nearby" className="rounded-[36px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_18px_70px_rgba(31,36,48,0.05)] md:p-7">
          <SectionIntro
            eyebrow="Nearby cities"
            title={`ไปไหนดีใกล้ ${city.name}`}
            description="เผื่อคุณอยากขยับเป็น day trip หรือเปลี่ยนบรรยากาศโดยยังเดินทางต่อได้จริง"
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {nearbyCities.map((nearby) => (
              <Link
                key={nearby.slug}
                href={`/city/${nearby.slug}`}
                className="group overflow-hidden rounded-[30px] border border-[var(--line)] bg-[rgba(255,253,249,0.92)] transition hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:shadow-[0_20px_60px_rgba(31,36,48,0.08)]"
              >
                <div className="relative h-44 overflow-hidden bg-[linear-gradient(180deg,#e7ded1,#d7dde3)]">
                  {nearby.heroImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={nearby.heroImage} alt={nearby.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                  ) : null}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(31,36,48,0.35))]" />
                  <div className="absolute left-4 top-4 rounded-full border border-white/30 bg-[rgba(255,250,244,0.78)] px-3 py-1 text-xs font-medium text-[var(--accent)] backdrop-blur">
                    ประมาณ {nearby.distanceKm} กม.
                  </div>
                </div>
                <div className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-serif text-2xl text-[var(--foreground)]">{nearby.name}</h3>
                      <p className="text-sm text-[var(--accent-warm)]">{nearby.japaneseName}</p>
                    </div>
                    <span className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-[11px] font-medium text-[var(--ink-muted)]">
                      {nearby.mood}
                    </span>
                  </div>
                  <p className="text-sm leading-7 text-[var(--ink-muted)]">{nearby.intro}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {pois.available && pois.items.length ? (
          <section id="pois" className="rounded-[36px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_18px_70px_rgba(31,36,48,0.05)] md:p-7">
            <SectionIntro
              eyebrow="More around the city"
              title="เผื่ออยากไปต่อ"
              description={`จุดที่อยู่รอบ ${city.name} ในรัศมี ~10 กม. ดึงอัตโนมัติจาก Wikipedia — กดการ์ดเพื่อเปิดตำแหน่งใน Google Maps`}
            />
            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {pois.items.map((poi) => (
                <a
                  key={poi.title}
                  href={`https://www.google.com/maps/search/?api=1&query=${poi.lat},${poi.lon}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex flex-col overflow-hidden rounded-[24px] border border-[var(--line)] bg-[rgba(255,253,249,0.9)] transition hover:border-[var(--line-strong)] hover:shadow-[0_16px_44px_rgba(31,36,48,0.08)]"
                >
                  {poi.thumbnail ? (
                    <div className="relative h-36 overflow-hidden bg-[linear-gradient(180deg,#e7ded1,#d7dde3)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={poi.thumbnail} alt={poi.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(31,36,48,0.25))]" />
                    </div>
                  ) : null}
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium text-[var(--foreground)]">{poi.title}</h3>
                      <span className="shrink-0 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--ink-muted)]">
                        ~{poi.distanceKm} กม.
                      </span>
                    </div>
                    {poi.extract ? <p className="mt-2 flex-1 text-xs leading-5 text-[var(--ink-muted)]">{poi.extract}</p> : null}
                  </div>
                </a>
              ))}
            </div>
            <p className="mt-4 px-1 text-xs leading-6 text-[var(--ink-muted)]">
              รายการนี้สร้างอัตโนมัติจาก {pois.source} จึงอาจมีจุดที่ไม่ใช่ที่เที่ยวปนบ้าง — ลิสต์คัดมืออยู่ที่หมวดไอเดียทริปในหน้าหลักของเมือง
            </p>
          </section>
        ) : null}

        <section id="news" className="rounded-[36px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_18px_70px_rgba(31,36,48,0.05)] md:p-7">
          <SectionIntro
            eyebrow="RSS / alerts"
            title="เหตุการณ์และข่าวที่ควรรู้"
            description="รวม feed ล่าสุดที่ช่วยเช็กว่าช่วงนี้มีข่าวหรือกิจกรรมที่น่ารู้ก่อนออกเที่ยวหรือไม่"
          />
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {events.available && events.items.length ? (
              events.items.map((item) => (
                <a
                  key={`${item.url}-${item.title}`}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[24px] border border-[var(--line)] bg-[rgba(255,253,249,0.9)] p-4 transition hover:border-[var(--line-strong)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">{item.title}</p>
                      <p className="mt-2 text-xs text-[var(--ink-muted)]">
                        {[item.source ?? events.source, item.publishedAt ? formatPublishedAt(item.publishedAt) : null].filter(Boolean).join(" • ")}
                      </p>
                    </div>
                    <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
                  </div>
                </a>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-[var(--line-strong)] bg-[rgba(255,253,249,0.8)] p-5 text-sm leading-7 text-[var(--ink-muted)]">
                {events.message ?? "ยังไม่มี feed ล่าสุดในตอนนี้"}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function SectionIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--accent-warm)]">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-3xl text-[var(--foreground)]">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-muted)]">{description}</p>
    </div>
  );
}

function formatPublishedAt(value: string) {
  try {
    return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}
