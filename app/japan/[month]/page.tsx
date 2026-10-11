import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prompt } from "@/components/tabi/fonts";
import "@/components/tabi/tabi.css";
import { closuresIn, monthHighlights, suggestRoutes } from "@/lib/tabi/planner";
import { MONTH_BY_SLUG, MONTHS } from "@/lib/tabi/months";

// /japan/<month> — what to see that month, sample routes and seasonal closures, all from the
// place store. Static (12 pages). Every call to action hands off to Tabi via /?q=….

type Props = { params: Promise<{ month: string }> };

export const dynamicParams = false;
export const revalidate = 604800; // a week: closures and photos change rarely

export function generateStaticParams() {
  return MONTHS.map((m) => ({ month: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = MONTH_BY_SLUG.get((await params).month);
  if (!m) return {};
  const title = `เที่ยวญี่ปุ่นเดือน${m.th} ไปไหนดี: ที่เที่ยวตามฤดู + เส้นทาง 5 วัน · Nagame`;
  const description = `${m.line} ดูที่เที่ยวเด่นเดือน${m.th} เส้นทางตัวอย่าง และที่ปิดตามฤดู แล้วให้ทาบิจัดทริปให้ฟรี`;
  return { title, description, alternates: { canonical: `/japan/${m.slug}` }, openGraph: { title, description, siteName: "Nagame", locale: "th_TH", type: "article", images: ["/opengraph-image.png"] } };
}

const ask = (q: string) => `/?q=${encodeURIComponent(q)}`;
const img = (wiki: string) => `/api/tabi/image?title=${encodeURIComponent(wiki)}`;

export default async function MonthPage({ params }: Props) {
  const m = MONTH_BY_SLUG.get((await params).month);
  if (!m) notFound();
  const places = monthHighlights(m.n, 6);
  const closures = closuresIn(m.n);
  const routes = await suggestRoutes(`อยากไปญี่ปุ่นเดือน${m.th} 5 วัน`, { month: m.n, durationDays: 5, preferences: [], focus: [] });
  const idx = MONTHS.findIndex((x) => x.n === m.n);
  const prev = MONTHS[(idx + 11) % 12];
  const next = MONTHS[(idx + 1) % 12];

  return (
    <div className={`${prompt.variable} tabi`}>
      <main className="tabi-shell space-y-6 lg:!pt-10">
        <nav className="flex items-center justify-between text-sm">
          <Link href="/" className="tabi-title text-xl font-bold">Nagame</Link>
          <Link href="/japan" className="text-[var(--t-blue)] underline underline-offset-2">ทุกเดือน</Link>
        </nav>

        <header className="space-y-3">
          <p className="text-4xl" aria-hidden>{m.emoji}</p>
          <h1 className="text-3xl font-bold leading-tight lg:text-5xl">เที่ยวญี่ปุ่นเดือน{m.th}</h1>
          <p className="max-w-2xl text-[var(--t-navy)] lg:text-lg">{m.line}</p>
          <a href={ask(`อยากไปญี่ปุ่นเดือน${m.th} 5 วัน`)} className="tabi-btn tabi-btn--primary">
            🐱 ให้ทาบิจัดทริปเดือน{m.th}
          </a>
        </header>

        {closures.length > 0 && (
          <section className="tabi-hazard">
            <h2 className="font-bold">ที่ปิดหรือเปิดไม่เต็มเดือนนี้</h2>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {closures.map((c) => (
                <li key={c.note}>{c.closed ? "ปิด: " : "เปิดบางช่วง: "}{c.note} <a href={c.source} target="_blank" rel="noopener noreferrer" className="underline">ที่มา ↗</a></li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-xl font-bold">ที่เที่ยวเด่นเดือน{m.th}</h2>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {places.map((p) => (
              <li key={p.id}>
                <a href={ask(`อยากไป ${p.name} เดือน${m.th} 5 วัน`)} className="tabi-card block overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img(p.wikiTitle)} alt="" loading="lazy" className="tabi-img h-[110px] w-full lg:h-[150px]" />
                  <span className="block p-3">
                    <span className="tabi-title block font-bold leading-snug">{p.name}</span>
                    <span className="tabi-muted block text-xs">{[p.nameEn, p.nameJa].filter(Boolean).join(" · ")}{p.nameEn || p.nameJa ? " · " : ""}ใกล้ {p.city}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="tabi-muted mt-1 text-[11px]">ภาพ: Wikipedia · กดที่ไหนก็ได้ ทาบิจะจัดทริปที่มีที่นั่นให้</p>
        </section>

        {routes.length > 0 && (
          <section>
            <h2 className="mb-3 text-xl font-bold">เส้นทางตัวอย่าง 5 วัน</h2>
            <ul className="space-y-3 lg:grid lg:grid-cols-3 lg:gap-3 lg:space-y-0">
              {routes.map((r) => (
                <li key={r.id} className="tabi-card space-y-2 p-4">
                  <p className="tabi-title font-bold">{r.stops.map((s) => `${s.cityTh} ${s.nights} คืน`).join(" → ")}</p>
                  <p className="tabi-muted text-sm">{r.reason}</p>
                  <Link href={ask(`อยากไป ${r.stops.map((s) => s.cityTh).join(" ")} เดือน${m.th} 5 วัน`)} className="tabi-btn tabi-btn--soft w-full text-sm">ให้ทาบิจัดเส้นนี้</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <nav className="flex items-center justify-between gap-3 border-t border-[var(--t-line)] pt-4 text-sm" aria-label="เดือนอื่น">
          <Link href={`/japan/${prev.slug}`} className="text-[var(--t-blue)]">← {prev.emoji} {prev.th}</Link>
          <Link href={`/japan/${next.slug}`} className="text-[var(--t-blue)]">{next.th} {next.emoji} →</Link>
        </nav>
      </main>
    </div>
  );
}
