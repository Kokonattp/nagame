"use client";

// TripPanel — แท็บทริป (ก้าว H). แสดงที่ที่ผู้ใช้บันทึกลงทริปของเมืองนี้ (localStorage).
// ตาม [[nagame-v2-direction]]: "สิ่งที่คุยกับกร๊วกจะมากองที่นี่". ยังเป็น localStorage
// (ดู lib/game/trip.ts) — พอมี backend ค่อย migrate. ลบได้, ว่าง = กร๊วกชวนไปเก็บ.

import { useEffect, useState } from "react";
import { MapPin, Trash2, Navigation } from "lucide-react";
import { getTripForCity, removeFromTrip, type TripItem } from "@/lib/game/trip";

export function TripPanel({ citySlug, cityName }: { citySlug: string; cityName: string }) {
  const [items, setItems] = useState<TripItem[] | null>(null); // null = ยังไม่อ่าน (กัน SSR mismatch)

  useEffect(() => {
    setItems(getTripForCity(citySlug));
  }, [citySlug]);

  // ยังไม่ mount (SSR) → โครงว่างเงียบ ไม่ render เนื้อ (localStorage อ่านได้เฉพาะ client)
  if (items === null) {
    return <div className="min-h-[420px]" />;
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="text-5xl" aria-hidden>
          🧳
        </div>
        <h2 className="font-serif text-2xl">ทริป {cityName}</h2>
        <p className="max-w-[40ch] text-sm leading-6 text-[var(--ink-muted)]">
          ยังไม่มีที่ในทริปนี้ — กดปุ่ม <span className="font-bold">＋ ทริป</span> ที่การ์ดของฝากจากกร๊วก
          แล้วที่ที่อยากไปจะมากองรวมกันตรงนี้
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[560px] p-4 md:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="font-serif text-2xl">ทริป {cityName}</h2>
        <span className="nb-pill px-3 py-1 text-xs">{items.length} ที่</span>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-[14px] border-2 border-[var(--nb-ink)] bg-[var(--surface)] px-3.5 py-3 shadow-[var(--nb-shadow-sm)]"
          >
            <span className="text-xl leading-none" aria-hidden>
              {item.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
              <p className="flex items-center gap-1 text-xs text-[var(--ink-muted)]">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                {item.area}
              </p>
            </div>
            <a
              href={`https://www.google.com/maps/search/${encodeURIComponent(`${item.title} ${item.area} ${cityName}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="nb-pill shrink-0 self-center px-2.5 py-1.5 text-[11px]"
              title="นำทางด้วย Google Maps"
            >
              <Navigation className="mr-1 inline h-3 w-3" aria-hidden />
              นำทาง
            </a>
            <button
              type="button"
              onClick={() => setItems(removeFromTrip(item.id).filter((it) => it.citySlug === citySlug))}
              className="shrink-0 self-center rounded-[8px] border-2 border-[var(--nb-ink)] bg-[var(--surface)] p-1.5 text-[var(--ink-muted)] transition hover:bg-[var(--nb-vermilion)] hover:text-white"
              aria-label={`ลบ ${item.title} ออกจากทริป`}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-[var(--ink-muted)]">
        ทริปเก็บในเครื่องนี้ก่อน — พอกร๊วกจำคุณได้ (มีบัญชี) จะตามไปทุกเครื่อง
      </p>
    </div>
  );
}
