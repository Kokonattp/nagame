import type { Recommendation } from "@/lib/cities/city-configs";

export function RecommendationCard({ item }: { item: Recommendation }) {
  return (
    <article className="min-h-32 rounded-3xl border border-white/70 bg-white/62 p-4 shadow-lg shadow-sky-950/5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black tracking-normal text-zinc-950">{item.title}</h3>
          <p className="mt-1 text-sm font-semibold text-zinc-500">{item.area}</p>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-950 px-2.5 py-1 text-xs font-bold text-white">
          {item.signal}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-zinc-600">{item.note}</p>
    </article>
  );
}
