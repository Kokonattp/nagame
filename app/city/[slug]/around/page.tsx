import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Activity, Banknote, ExternalLink, Home } from "lucide-react";
import { getCityConfigBySlug } from "@/lib/cities/city-configs";
import { getNearbyCities } from "@/lib/cities/travel-meta";
import { formatMonthDay, windowStatus } from "@/lib/cities/holidays";
import { getCitySeasons, type SeasonKind } from "@/lib/cities/seasons";
import { getCityTransit } from "@/lib/cities/transit";
import { getCityDrive } from "@/lib/cities/drive-spots";
import { getCityHeroImagesBulk } from "@/lib/services/city-images";
import { getEvents } from "@/lib/services/events";
import { getFx } from "@/lib/services/fx";
import { getQuakes } from "@/lib/services/quakes";
import { resolveCity } from "@/lib/services/geocode";
import { getWikiPois } from "@/lib/services/pois";
import { AroundTransit } from "@/components/around-transit";
import { AroundDrive } from "@/components/around-drive";

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
  const [pois, events, heroImages, fx, quakes] = await Promise.all([
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
    getFx(),
    getQuakes(city.lat, city.lon),
  ]);
  const nearbyCities = nearbyBase.map((nearby) => ({
    ...nearby,
    heroImage: nearby.heroImage ?? heroImages.get(nearby.slug) ?? undefined,
  }));

  // signal รองที่ย้ายมาจากหน้าหลัก (transit/drive/season = local compute)
  const transit = getCityTransit(city.slug);
  const drive = getCityDrive(city.slug);
  const seasonItems = getCitySeasons(city.slug)
    .map((item) => ({ ...item, status: windowStatus(item.from, item.to) }))
    .sort((a, b) => seasonRank(a.status) - seasonRank(b.status));

  return (
    <main className="min-h-screen overflow-x-clip text-[var(--foreground)]">
      <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-8 px-4 pb-12 pt-4 md:px-8 md:pt-6 xl:px-10">
        <header className="nb-card px-4 py-4 md:px-6">
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
              <Link href={`/city/${city.slug}`} className="nb-pill nb-pill-indigo inline-flex items-center gap-1.5 px-4 py-2">
                <Home className="h-3.5 w-3.5" aria-hidden />
                กลับหาอาแป๊ะ
              </Link>
              {transit ? <a href="#transit" className="nb-pill px-4 py-2 transition hover:bg-[var(--nb-gold)]/20">เดินทาง</a> : null}
              {drive ? <a href="#drive" className="nb-pill px-4 py-2 transition hover:bg-[var(--nb-gold)]/20">ขับรถ</a> : null}
              {seasonItems.length ? <a href="#season" className="nb-pill px-4 py-2 transition hover:bg-[var(--nb-gold)]/20">ฤดูกาล</a> : null}
              <a href="#nearby" className="nb-pill px-4 py-2 transition hover:bg-[var(--nb-gold)]/20">เมืองใกล้เคียง</a>
              <a href="#live" className="nb-pill px-4 py-2 transition hover:bg-[var(--nb-gold)]/20">ดูสด</a>
            </nav>
          </div>
        </header>

        {transit ? <AroundTransit transit={transit} /> : null}

        {drive ? <AroundDrive drive={drive} cityName={city.name} /> : null}

        {seasonItems.length ? (
          <section id="season" className="nb-card p-5 md:p-7">
            <SectionIntro
              eyebrow="Season radar"
              title={`จังหวะฤดูกาลของ ${city.name}`}
              description="ช่วงพีคโดยประมาณจากค่าเฉลี่ยหลายปี ใช้วางแผนล่วงหน้าได้ว่าควรมาเดือนไหน"
            />
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {seasonItems.map((item) => (
                <div key={item.name} className="nb-flat flex flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-[var(--nb-ink)]" style={{ backgroundColor: seasonKindColors[item.kind] }} aria-hidden />
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">{item.name}</h3>
                    </div>
                    {item.status.state === "active" ? (
                      <span className="nb-pill nb-pill-ok">กำลังพีค</span>
                    ) : item.status.state === "upcoming" ? (
                      <span className="nb-pill nb-pill-gold">อีก {item.status.daysUntil} วัน</span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-xs font-semibold text-[var(--accent-warm)]">
                    {formatMonthDay(item.from)} – {formatMonthDay(item.to)}
                  </p>
                  <p className="mt-1.5 text-xs leading-5 text-[var(--ink-muted)]">{item.note}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section id="nearby" className="nb-card p-5 md:p-7">
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
                className="nb-card-sm group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--nb-ink)]"
              >
                <div className="relative h-44 overflow-hidden bg-[linear-gradient(180deg,#e7ded1,#d7dde3)]">
                  {nearby.heroImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={nearby.heroImage} alt={nearby.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                  ) : null}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(31,36,48,0.35))]" />
                  <div className="absolute left-3 top-3 rounded-full border-2 border-[var(--nb-ink)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--nb-ink)]">
                    ประมาณ {nearby.distanceKm} กม.
                  </div>
                </div>
                <div className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-serif text-2xl text-[var(--foreground)]">{nearby.name}</h3>
                      <p className="text-sm text-[var(--accent-warm)]">{nearby.japaneseName}</p>
                    </div>
                    <span className="nb-pill shrink-0">{nearby.mood}</span>
                  </div>
                  <p className="text-sm leading-7 text-[var(--ink-muted)]">{nearby.intro}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {pois.available && pois.items.length ? (
          <section id="pois" className="nb-card p-5 md:p-7">
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
                  className="nb-card-sm group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--nb-ink)]"
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
                      <span className="nb-pill shrink-0">~{poi.distanceKm} กม.</span>
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

        <section id="news" className="nb-card p-5 md:p-7">
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
                  className="nb-flat p-4 transition hover:bg-[var(--nb-gold)]/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
                      <p className="mt-2 text-xs text-[var(--ink-muted)]">
                        {[item.source ?? events.source, item.publishedAt ? formatPublishedAt(item.publishedAt) : null].filter(Boolean).join(" • ")}
                      </p>
                    </div>
                    <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
                  </div>
                </a>
              ))
            ) : (
              <div className="nb-flat border-dashed p-5 text-sm leading-7 text-[var(--ink-muted)]">
                {events.message ?? "ยังไม่มี feed ล่าสุดในตอนนี้"}
              </div>
            )}
          </div>
        </section>

        <section id="live" className="grid gap-6 lg:grid-cols-2">
          <div className="nb-card p-5 md:p-7">
            <div className="flex items-start justify-between gap-4">
              <SectionIntro
                eyebrow="Earthquake watch"
                title="แผ่นดินไหวรอบ 72 ชม."
                description={`เฝ้าดูแผ่นดินไหวใกล้ ${city.name} (รัศมี ~350 กม.) และเหตุรุนแรงทั่วญี่ปุ่น จาก JMA`}
              />
              <div className="nb-flat hidden shrink-0 p-3 text-[var(--nb-ink)] md:block">
                <Activity className="h-5 w-5" aria-hidden />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {quakes.available && quakes.items.length ? (
                quakes.items.map((item) => (
                  <div key={`${item.time}-${item.place}`} className="nb-flat px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {item.place}
                        {item.tsunami ? <span className="nb-pill nb-pill-alert ml-2">เฝ้าระวังสึนามิ</span> : null}
                      </p>
                      <p className="shrink-0 text-sm font-semibold text-[var(--nb-ink)]">
                        {typeof item.magnitude === "number" ? `M${item.magnitude}` : "M–"}
                      </p>
                    </div>
                    <p className="mt-1 text-xs leading-6 text-[var(--ink-muted)]">
                      {[
                        item.shindo ? `แรงสั่นสูงสุดระดับ ${item.shindo}` : null,
                        item.distanceKm !== null ? `ห่างประมาณ ${item.distanceKm} กม.` : null,
                        `${item.time} JST`,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>
                ))
              ) : (
                <div className="nb-flat px-4 py-4 text-sm leading-7 text-[var(--ink-muted)]">
                  {quakes.available
                    ? `ไม่มีแผ่นดินไหวที่น่ากังวลใกล้ ${city.name} ในช่วง 72 ชั่วโมงที่ผ่านมา`
                    : quakes.message ?? "ยังเชื่อมต่อข้อมูลแผ่นดินไหวไม่ได้ในตอนนี้"}
                </div>
              )}
            </div>
          </div>

          <div className="nb-card p-5 md:p-7">
            <div className="flex items-start justify-between gap-4">
              <SectionIntro
                eyebrow="Money"
                title="เรทเงินสำหรับทริป"
                description="อัตราแลกเปลี่ยนกลางเยน-บาท อัปเดตทุก 6 ชั่วโมง ใช้กะงบหน้างานได้เลย"
              />
              <div className="nb-flat hidden shrink-0 p-3 text-[var(--nb-ink)] md:block">
                <Banknote className="h-5 w-5" aria-hidden />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {fx.available && fx.thbPer100Jpy !== null ? (
                <>
                  <SignalRow label="100 เยน" value={`≈ ${fx.thbPer100Jpy.toFixed(2)} บาท`} note="ค่าน้ำ ขนม ของจุกจิก" />
                  <SignalRow label="1,000 เยน" value={`≈ ${(fx.thbPer100Jpy * 10).toFixed(0)} บาท`} note="ราเมงหนึ่งชาม / ตั๋วรถไฟในเมือง" />
                  <SignalRow label="10,000 เยน" value={`≈ ${(fx.thbPer100Jpy * 100).toFixed(0)} บาท`} note="งบกินเที่ยวสบาย ๆ หนึ่งวัน" />
                  {fx.jpyPer100Thb !== null ? (
                    <p className="px-1 text-xs text-[var(--ink-muted)]">กลับด้าน: 100 บาท ≈ {fx.jpyPer100Thb.toFixed(0)} เยน</p>
                  ) : null}
                </>
              ) : (
                <div className="nb-flat px-4 py-4 text-sm leading-7 text-[var(--ink-muted)]">
                  ยังดึงอัตราแลกเปลี่ยนไม่ได้ในตอนนี้ ลองรีเฟรชอีกครั้ง
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

const seasonKindColors: Record<SeasonKind, string> = {
  bloom: "#d98ca6",
  foliage: "#c0392b",
  snow: "#5dade2",
  event: "#b8860b",
};

function seasonRank(status: ReturnType<typeof windowStatus>) {
  if (status.state === "active") return -1;
  if (status.state === "upcoming") return status.daysUntil;
  return 9999;
}

function SignalRow({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="nb-flat flex items-start justify-between gap-4 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-[var(--foreground)]">{label}</p>
        <p className="mt-1 text-xs leading-6 text-[var(--ink-muted)]">{note}</p>
      </div>
      <p className="text-right text-lg font-semibold text-[var(--nb-ink)]">{value}</p>
    </div>
  );
}

function SectionIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-warm)]">{eyebrow}</p>
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
