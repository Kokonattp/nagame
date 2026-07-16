import Link from "next/link";
import { CitySearch } from "@/components/city-search";
import { ChatPanel } from "@/components/chat/chat-panel";
import { getAdvisorChatReply } from "@/lib/services/advisor";
import { cityConfigs } from "@/lib/cities/city-configs";
import { japanMajorCities } from "@/lib/cities/japan-major-cities";
import { getCityMeta } from "@/lib/cities/travel-meta";
import { getCityHeroImagesBulk } from "@/lib/services/city-images";

export const revalidate = 86400;

// หน้าแรก = แชทกร๊วกทันที ไม่บังคับเลือกเมืองก่อน (Phase 0 U7, docs/chat-cards-roadmap.md).
// seed มาจาก getAdvisorChatReply(null, ...) — ตอบระดับประเทศจาก season data ล้วน ไม่ยิง LLM
// (ถูก+เร็วพอสำหรับ revalidate รายวัน) กริดเมืองเดิมย้ายลงใต้แชท คนรู้ปลายทางคลิกตรงได้เหมือนเดิม.
export default async function Home() {
  const [heroImages, seed] = await Promise.all([
    getCityHeroImagesBulk(
      cityConfigs
        .filter((city) => !getCityMeta(city.slug, city.name).heroImage)
        .map((city) => ({
          slug: city.slug,
          name: city.name,
          prefecture: city.prefecture,
          japaneseName: city.japaneseName,
        })),
    ),
    getAdvisorChatReply(null, "สวัสดี"),
  ]);

  const cities = cityConfigs.map((city) => {
    const meta = getCityMeta(city.slug, city.name);

    return {
      slug: city.slug,
      name: city.name,
      japaneseName: city.japaneseName,
      prefecture: city.prefecture,
      mood: meta.mood,
      intro: meta.intro,
      heroImage: meta.heroImage ?? heroImages.get(city.slug) ?? null,
    };
  });

  return (
    <main className="min-h-screen text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-[1280px] space-y-10 px-4 pb-16 pt-8 md:px-8 md:pt-12">
        <header className="space-y-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[var(--accent-warm)]">
            Nagame Travel Companion
          </p>
          <div className="space-y-3">
            <h1 className="font-serif text-4xl leading-tight md:text-6xl">
              ถามกร๊วกได้เลย — เพื่อนแมวที่อยู่ญี่ปุ่นตอนนี้
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-[var(--ink-muted)] md:text-base md:leading-8">
              ยังไม่รู้จะไปเมืองไหนก็ถามได้ เช่น &quot;เดือนนี้ไปไหนดี&quot; หรือ &quot;หิมะตกที่ไหน&quot; —
              กร๊วกช่วยดูอากาศ ฤดู กล้องสด และที่พัก-ที่กินให้ในที่เดียว
            </p>
          </div>
        </header>

        <section className="nb-card p-5 md:p-6">
          <ChatPanel seedBubbles={seed.bubbles} seedCards={seed.cards} placeholder="เช่น เดือนนี้ไปไหนดี หรือ ธันวาไปโตเกียวหนาวไหม" />
        </section>

        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--accent-warm)]">
                All cities
              </p>
              <h2 className="mt-2 font-serif text-3xl">หรือเลือกเมืองที่อยากไปเลย</h2>
            </div>
            <p className="hidden text-sm text-[var(--ink-muted)] md:block">{cities.length} เมือง</p>
          </div>

          <CitySearch seeds={japanMajorCities} />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cities.map((city) => (
              <Link
                key={city.slug}
                href={`/city/${city.slug}`}
                className="group overflow-hidden rounded-[28px] border border-[var(--line)] bg-[rgba(255,253,249,0.92)] transition hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:shadow-[0_20px_60px_rgba(31,36,48,0.08)]"
              >
                <div className="relative h-40 overflow-hidden bg-[linear-gradient(180deg,#e7ded1,#d7dde3)]">
                  {city.heroImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={city.heroImage}
                      alt={city.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(31,36,48,0.4))]" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
                    <div>
                      <p className="font-serif text-2xl text-[#fdfaf5]">{city.name}</p>
                      <p className="text-xs text-[#efe5d6]">{city.japaneseName} · {city.prefecture}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 p-4">
                  <span className="inline-block rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-[11px] font-medium text-[var(--ink-muted)]">
                    {city.mood}
                  </span>
                  <p className="line-clamp-2 text-sm leading-6 text-[var(--ink-muted)]">{city.intro}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
