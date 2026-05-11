import type { Recommendation } from "@/lib/cities/city-configs";

export function RecommendationCard({ item }: { item: Recommendation }) {
  const image = imageFor(item.kind, item.title);

  return (
    <article className="w-[136px] shrink-0 overflow-hidden rounded-2xl border border-zinc-200/70 bg-white shadow-lg shadow-zinc-950/8">
      <div className="relative h-24 overflow-hidden bg-sky-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
        <span className="absolute left-2 top-2 rounded-full bg-white/86 px-2 py-1 text-[11px] font-black text-emerald-700 backdrop-blur-md">
          {item.signal}
        </span>
      </div>
      <div className="p-3">
        <div>
          <h3 className="line-clamp-2 min-h-10 text-sm font-black leading-5 tracking-normal text-zinc-950">{item.title}</h3>
          <p className="mt-1 line-clamp-1 text-xs font-semibold text-zinc-500">{item.area}</p>
        </div>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-600">{item.note}</p>
      </div>
    </article>
  );
}

function imageFor(kind: Recommendation["kind"], title: string) {
  const text = title.toLowerCase();
  if (text.includes("ramen") || text.includes("soba") || text.includes("udon")) {
    return "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=360&q=80";
  }
  if (kind === "eat") {
    return "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=360&q=80";
  }
  if (kind === "sleep") {
    return "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=360&q=80";
  }
  if (text.includes("park") || text.includes("garden")) {
    return "https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=360&q=80";
  }
  return "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=360&q=80";
}
