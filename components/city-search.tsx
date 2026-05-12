"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPinned, Search } from "lucide-react";
import type { JapanCitySeed } from "@/lib/cities/japan-major-cities";

export function CitySearch({
  seeds,
  defaultValue = "",
}: {
  seeds: JapanCitySeed[];
  defaultValue?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const suggestions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return seeds.slice(0, 8);

    return seeds
      .filter((city) =>
        `${city.name} ${city.japaneseName ?? ""} ${city.prefecture}`.toLowerCase().includes(normalized),
      )
      .slice(0, 8);
  }, [query, seeds]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim() || defaultValue || "Fukuoka";
    await goToCity(value);
  }

  async function goToCity(value: string) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`);
      const data = (await response.json()) as { city?: { slug: string; name: string }; error?: string };

      if (!response.ok || !data.city) {
        setError(data.error ?? "ยังหาเมืองนี้ในญี่ปุ่นไม่เจอ");
        return;
      }

      setQuery(data.city.name);
      router.push(`/city/${data.city.slug}`);
    } catch {
      setError("ค้นหาเมืองไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={handleSubmit}
        className="rounded-[28px] border border-[var(--line)] bg-[rgba(255,252,247,0.92)] p-2 shadow-[0_18px_54px_rgba(31,36,48,0.06)] backdrop-blur"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[20px] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-[var(--ink-muted)]" aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาเมืองในญี่ปุ่น เช่น Fukuoka, Kyoto, Naha"
              className="h-10 min-w-0 flex-1 bg-transparent text-sm font-medium text-[var(--foreground)] outline-none placeholder:text-[#9d9488] md:text-base"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] bg-[var(--accent)] px-5 text-sm font-semibold text-[#faf7f2] transition hover:bg-[#1b2a39] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <MapPinned className="h-4 w-4" aria-hidden />}
            ไปเมืองนี้
          </button>
        </div>
      </form>

      {error ? <p className="px-1 text-sm font-medium text-[#9c3d31]">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {suggestions.map((city) => (
          <button
            key={city.slug}
            type="button"
            onClick={() => goToCity(city.name)}
            className="rounded-full border border-[var(--line)] bg-[rgba(255,253,250,0.92)] px-3 py-2 text-xs font-medium text-[var(--accent)] transition hover:border-[var(--line-strong)] hover:bg-white md:text-sm"
          >
            {city.name}
          </button>
        ))}
      </div>
    </div>
  );
}
