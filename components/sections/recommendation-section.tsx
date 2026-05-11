import type { Recommendation, RecommendationKind } from "@/lib/cities/city-configs";
import { RecommendationCard } from "@/components/sections/recommendation-card";

const titles: Record<RecommendationKind, string> = {
  see: "ไปไหนดี",
  eat: "กินอะไรดี",
  sleep: "นอนไหนดี",
};

export function RecommendationSection({
  kind,
  items,
  configured,
}: {
  kind: RecommendationKind;
  items: Recommendation[];
  configured: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between px-4">
        <h2 className="text-2xl font-black tracking-normal">{titles[kind]}</h2>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${titles[kind]} Fukuoka Japan`)}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-bold text-violet-600"
        >
          ดูทั้งหมด ›
        </a>
      </div>
      {configured && items.length ? (
        <div className="flex gap-3 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => (
            <RecommendationCard key={`${item.kind}-${item.title}`} item={item} />
          ))}
        </div>
      ) : (
        <div className="mx-4 rounded-3xl border border-white/70 bg-white p-5 shadow-lg shadow-sky-950/5">
          <p className="text-sm leading-6 text-zinc-600">
            ข้อมูลแนะนำท้องถิ่นของเมืองนี้ยังไม่ครบ แต่คุณยังดูสภาพอากาศ AQI และกล้องใกล้เคียงได้
          </p>
        </div>
      )}
    </section>
  );
}
