"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ExternalLink, Ticket, TrainFront } from "lucide-react";
import type { CityTransit, TransitLineKind } from "@/lib/cities/transit";

// client island สำหรับ /around — transit มี state (selectedLineId) + TransitMap
// (dynamic ssr:false) เลยต้องเป็น client component แยก ไม่ยัด "use client" ทั้ง
// around page. ธีม neo-brutalist-washi ให้ตรงหน้าหลัก.
const TransitMap = dynamic(() => import("@/components/transit-map").then((mod) => mod.TransitMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[var(--surface-soft)] text-xs text-[var(--ink-muted)]">กำลังโหลดแผนที่...</div>
  ),
});

const transitKindLabels: Record<TransitLineKind, string> = {
  subway: "ใต้ดิน",
  jr: "JR",
  tram: "รถราง",
  bus: "บัส",
};

// ปลายทางสำหรับลิงก์ Google Maps — ใช้ป้ายที่ไกลจากสถานีต้นทางที่สุด
function farthestStop(line: CityTransit["lines"][number], station: CityTransit["station"]) {
  let best = line.stops[line.stops.length - 1];
  let bestDistance = -1;
  for (const stop of line.stops) {
    const distance = (stop.lat - station.lat) ** 2 + (stop.lon - station.lon) ** 2;
    if (distance > bestDistance) {
      bestDistance = distance;
      best = stop;
    }
  }
  return best;
}

export function AroundTransit({ transit }: { transit: CityTransit }) {
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);

  return (
    <section id="transit" className="nb-card p-5 md:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-warm)]">From the station</p>
          <h2 className="mt-2 font-serif text-3xl text-[var(--foreground)]">ขึ้นอะไรจาก {transit.station.name}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-muted)]">{transit.description}</p>
        </div>
        <div className="nb-flat hidden shrink-0 p-3 text-[var(--nb-ink)] md:block">
          <TrainFront className="h-5 w-5" aria-hidden />
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <div className="h-[340px] overflow-hidden rounded-[var(--nb-radius)] border-2 border-[var(--nb-ink)] md:h-[440px]">
          <TransitMap
            transit={transit}
            selectedLineId={selectedLineId}
            onSelect={(lineId) => setSelectedLineId((prev) => (prev === lineId ? null : lineId))}
          />
        </div>

        <div className="grid content-start gap-2.5 xl:max-h-[440px] xl:overflow-y-auto xl:pr-1">
          {transit.lines.map((line) => {
            const destination = farthestStop(line, transit.station);
            const selected = selectedLineId === line.id;
            return (
              <div
                key={line.id}
                className={`flex items-stretch gap-2 rounded-[var(--nb-radius-sm)] border-2 p-3 transition ${
                  selected ? "border-[var(--nb-ink)] bg-[var(--nb-gold)]/15 shadow-[var(--nb-shadow-sm)]" : "border-[var(--nb-ink)] bg-[var(--surface)]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedLineId((prev) => (prev === line.id ? null : line.id))}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-full border border-[var(--nb-ink)]" style={{ backgroundColor: line.color }} aria-hidden />
                    <span className="text-sm font-semibold text-[var(--foreground)]">{line.name}</span>
                    <span className="nb-pill">{transitKindLabels[line.kind]}</span>
                  </div>
                  <p className="mt-1.5 text-xs font-semibold text-[var(--accent-warm)]">→ {line.to}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{line.note}</p>
                  {line.boardAt ? (
                    <p className="mt-1 text-[11px] leading-5 text-[var(--ink-muted)]">จุดขึ้นรถ: {line.boardAt}</p>
                  ) : null}
                </button>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${transit.station.lat},${transit.station.lon}&destination=${destination.lat},${destination.lon}&travelmode=transit`}
                  target="_blank"
                  rel="noreferrer"
                  title={`เปิดเส้นทางไป ${destination.name} ใน Google Maps`}
                  className="flex shrink-0 items-center self-center rounded-full border-2 border-[var(--nb-ink)] p-2.5 text-[var(--nb-ink)] transition hover:bg-[var(--nb-gold)]/20"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden />
                </a>
              </div>
            );
          })}
        </div>
      </div>

      {transit.passes?.length ? (
        <div className="mt-5 nb-flat p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
            <Ticket className="h-4 w-4 text-[var(--nb-ink)]" aria-hidden />
            ตั๋ว pass ที่คุ้มสำหรับเมืองนี้
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {transit.passes.map((pass) => (
              <div key={pass.name} className="flex items-start justify-between gap-3 rounded-[var(--nb-radius-sm)] border-2 border-[var(--nb-ink)] bg-[var(--surface-soft)] px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{pass.name}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{pass.note}</p>
                </div>
                <span className="nb-pill nb-pill-gold shrink-0">{pass.price}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 px-1 text-[11px] leading-5 text-[var(--ink-muted)]">ราคาโดยประมาณ อาจปรับได้ — เช็กอีกครั้งตอนซื้อหน้าเคาน์เตอร์/ตู้</p>
        </div>
      ) : null}

      <p className="mt-4 px-1 text-xs leading-6 text-[var(--ink-muted)]">
        เส้นทางคัดมือสำหรับนักท่องเที่ยว แสดงเฉพาะป้ายหลัก ตำแหน่งเป็นค่าโดยประมาณ — กดที่สายเพื่อไฮไลต์บนแผนที่ หรือกดไอคอนลิงก์เพื่อดูตารางเวลาจริงใน Google Maps
      </p>
    </section>
  );
}
