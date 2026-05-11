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
      <div className="flex items-end justify-between px-1">
        <h2 className="text-xl font-black tracking-normal">{titles[kind]}</h2>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Local</p>
      </div>
      {configured && items.length ? (
        <div className="grid gap-3">
          {items.map((item) => (
            <RecommendationCard key={`${item.kind}-${item.title}`} item={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/70 bg-white/55 p-5 shadow-lg shadow-sky-950/5 backdrop-blur-xl">
          <p className="text-sm leading-6 text-zinc-600">
            ข้อมูลแนะนำท้องถิ่นของเมืองนี้ยังไม่ครบ แต่คุณยังดูสภาพอากาศ AQI และกล้องใกล้เคียงได้
          </p>
        </div>
      )}
    </section>
  );
}
