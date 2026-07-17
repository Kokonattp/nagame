"use client";

// TripPanel — แท็บทริป. แสดงที่ที่ผู้ใช้บันทึกลงทริปของเมืองนี้ + วันเดินทาง + สถานะ.
// ตาม [[nagame-v2-direction]]: "สิ่งที่คุยกับกร๊วกจะมากองที่นี่".
//
// Phase 2 (Trip lifecycle): เพิ่มวันเดินทาง → status derive จากเหตุการณ์จริง
// (lib/game/trip-lifecycle.ts) ไม่ใช่ปุ่มกดเปลี่ยนสถานะเอง — ปลอมไม่ได้ = signal ซื่อสัตย์.
//
// identity = device id ล้วน (เจ้าของตัด LINE Login ออก 2026-07-17) → เขียน UX ให้ซื่อสัตย์
// ว่าของผูกกับเครื่องนี้.

import { useEffect, useState } from "react";
import { MapPin, Trash2, Navigation, CalendarDays } from "lucide-react";
import { getTripForCity, loadTripFromServer, removeFromTrip, type TripItem } from "@/lib/game/trip";
import {
  STATUS_LABEL,
  STATUS_TONE,
  deriveStatus,
  getTripMeta,
  setTripMeta,
  loadMetaFromServer,
  todayISO,
  daysBetween,
  type TripMeta,
} from "@/lib/game/trip-lifecycle";
import { buildOutbound } from "@/lib/outbound";

// pill สถานะ — ใช้ token --nb-* เดิม (nagame-design: indigo=ข้อมูล, gold=highlight, matcha=ok)
function StatusPill({ tone, children }: { tone: "indigo" | "gold" | "matcha"; children: React.ReactNode }) {
  const cls = tone === "indigo" ? "nb-pill-indigo" : tone === "gold" ? "nb-pill-gold" : "nb-pill-ok";
  return <span className={`nb-pill ${cls} px-3 py-1 text-xs`}>{children}</span>;
}

export function TripPanel({ citySlug, cityName }: { citySlug: string; cityName: string }) {
  const [items, setItems] = useState<TripItem[] | null>(null); // null = ยังไม่อ่าน (กัน SSR mismatch)
  const [meta, setMeta] = useState<TripMeta | null>(null);

  useEffect(() => {
    // แสดง local ทันที (เร็ว) แล้วค่อย merge จาก server (ถ้า backend ตั้งไว้ — ไม่งั้นเงียบ)
    setItems(getTripForCity(citySlug));
    setMeta(getTripMeta(citySlug));
    void loadTripFromServer().then((merged) => setItems(merged.filter((it) => it.citySlug === citySlug)));
    // เมตา (วันเดินทาง) sync แยก — ถ้าไม่มี backend จะเงียบ localStorage ยังทำงาน
    void loadMetaFromServer().then(() => setMeta(getTripMeta(citySlug)));
  }, [citySlug]);

  // ยังไม่ mount (SSR) → โครงว่างเงียบ ไม่ render เนื้อ (localStorage อ่านได้เฉพาะ client)
  if (items === null || meta === null) {
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

  const status = deriveStatus(meta);
  const today = todayISO();
  const daysUntil = meta.startDate ? daysBetween(today, meta.startDate) : null;

  function patchMeta(patch: Partial<Omit<TripMeta, "citySlug">>) {
    setMeta(setTripMeta(citySlug, patch));
  }

  return (
    <div className="mx-auto max-w-[560px] p-4 md:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="font-serif text-2xl">ทริป {cityName}</h2>
        <div className="flex shrink-0 items-center gap-2">
          <StatusPill tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</StatusPill>
          <span className="nb-pill px-3 py-1 text-xs">{items.length} ที่</span>
        </div>
      </div>

      {/* ── วันเดินทาง — ตัวปลดล็อก lifecycle (ไม่ใส่วัน = ยังฝันอยู่) ── */}
      <div className="nb-card-sm mb-4 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-warm)]">
          วันเดินทาง · trip dates
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--ink-muted)]">ไปวันที่</span>
            <input
              type="date"
              value={meta.startDate ?? ""}
              onChange={(e) => patchMeta({ startDate: e.target.value || undefined })}
              className="rounded-[var(--nb-radius-sm)] border-2 border-[var(--nb-ink)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:shadow-[var(--nb-shadow-press)]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--ink-muted)]">กลับวันที่</span>
            <input
              type="date"
              value={meta.endDate ?? ""}
              min={meta.startDate}
              onChange={(e) => patchMeta({ endDate: e.target.value || undefined })}
              className="rounded-[var(--nb-radius-sm)] border-2 border-[var(--nb-ink)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:shadow-[var(--nb-shadow-press)]"
            />
          </label>
        </div>

        {/* นับถอยหลัง — ตัวเลขใช้ font-serif ตามซิกเนเจอร์ */}
        {daysUntil !== null && daysUntil > 0 ? (
          <p className="mt-3 flex items-baseline gap-2 text-sm text-[var(--ink-muted)]">
            <CalendarDays className="h-4 w-4 shrink-0 self-center" aria-hidden />
            อีก <span className="font-serif text-2xl text-[var(--foreground)]">{daysUntil}</span> วันได้ไป {cityName}
          </p>
        ) : null}
        {status === "flying" ? (
          <p className="mt-3 text-sm font-bold text-[var(--nb-gold)]">กร๊วกรออยู่ที่ {cityName} แล้ว 🐾</p>
        ) : null}
        {status === "done" ? (
          <p className="mt-3 text-sm text-[var(--ink-muted)]">ไปมาแล้ว — หวังว่าสนุกนะ</p>
        ) : null}

        {/* จองแล้ว: fallback ของ clickout (บาง booking ไม่ผ่านลิงก์เรา) — โชว์เฉพาะตอนใส่วันแล้วและยังไม่ไป */}
        {(status === "planning" || status === "booked") && !meta.bookedSignalAt ? (
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(meta.bookedManually)}
              onChange={(e) => patchMeta({ bookedManually: e.target.checked || undefined })}
              className="h-4 w-4 accent-[var(--nb-gold)]"
            />
            <span className="text-[var(--foreground)]">จองที่พัก/ตั๋วแล้ว</span>
          </label>
        ) : null}
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
            {/* นำทางต้องผ่าน buildOutbound — เดิมเป็น <a href> ดิบ = click-out หายจากท่อวัดรายได้ */}
            <a
              href={buildOutbound(
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.title} ${item.area} ${cityName}`)}`,
                { kind: "nav", label: item.title, citySlug },
              )}
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

      {/* ซื่อสัตย์กับผู้ใช้: identity = device id ล้วน ไม่มีบัญชี (ตัด LINE Login ออกแล้ว) */}
      <p className="mt-4 text-center text-xs text-[var(--ink-muted)]">
        ทริปผูกกับเครื่องนี้ — ล้างข้อมูลเบราว์เซอร์แล้วหาย
      </p>
    </div>
  );
}
