"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { JapanCitySeed } from "@/lib/cities/japan-major-cities";

export function CitySearch({
  seeds,
  compact = false,
}: {
  seeds: JapanCitySeed[];
  compact?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const suggestions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return seeds.slice(0, compact ? 6 : 10);
    return seeds
      .filter((city) =>
        `${city.name} ${city.japaneseName ?? ""} ${city.prefecture}`.toLowerCase().includes(normalized),
      )
      .slice(0, compact ? 4 : 8);
  }, [compact, query, seeds]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim() || "Fukuoka";
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`);
      const data = (await response.json()) as { city?: { slug: string }; error?: string };
      if (!response.ok || !data.city) {
        setError(data.error ?? "ยังหาเมืองนี้ไม่เจอ");
        return;
      }
      router.push(`/city/${data.city.slug}`);
    } catch {
      setError("ค้นหาไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="flex items-center gap-2 rounded-full border border-white/70 bg-white/72 p-1.5 shadow-lg shadow-sky-900/5 backdrop-blur-xl">
        <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
          <Search className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาเมืองในญี่ปุ่น"
            className="h-10 min-w-0 flex-1 bg-transparent text-base font-medium text-zinc-950 outline-none placeholder:text-zinc-400"
          />
        </div>
        <Button className="h-10 px-4" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "ไป"}
        </Button>
      </form>

      {error ? <p className="px-2 text-sm font-medium text-rose-700">{error}</p> : null}

      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {suggestions.map((city) => (
          <button
            key={city.slug}
            onClick={() => router.push(`/city/${city.slug}`)}
            className="shrink-0 rounded-full border border-white/70 bg-white/55 px-3.5 py-2 text-sm font-semibold text-zinc-700 shadow-sm backdrop-blur-xl transition hover:bg-white"
            type="button"
          >
            {city.name}
          </button>
        ))}
      </div>
    </div>
  );
}
