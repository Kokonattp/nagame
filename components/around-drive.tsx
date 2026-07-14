"use client";

import { useState } from "react";
import { Car, Check, Copy } from "lucide-react";
import type { CityDrive } from "@/lib/cities/drive-spots";

// client island สำหรับ /around — DriveSection มี state (copiedSpot) เลยแยกเป็น
// client component ไม่ให้ around page ทั้งไฟล์กลายเป็น "use client" (เสีย server
// benefit ของ pois/events). ธีม neo-brutalist-washi ให้ตรงหน้าหลัก.
export function AroundDrive({ drive, cityName }: { drive: CityDrive; cityName: string }) {
  const [copiedSpot, setCopiedSpot] = useState<string | null>(null);

  async function copyMapcode(spotName: string, mapcode: string) {
    try {
      await navigator.clipboard.writeText(mapcode);
      setCopiedSpot(spotName);
      setTimeout(() => setCopiedSpot((prev) => (prev === spotName ? null : prev)), 2000);
    } catch {
      // clipboard ใช้ไม่ได้ (เช่น เปิดผ่าน http) — ผู้ใช้ยังอ่านรหัสจากหน้าจอได้
    }
  }

  return (
    <section id="drive" className="nb-card p-5 md:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-warm)]">Drive &amp; mapcode</p>
          <h2 className="mt-2 font-serif text-3xl text-[var(--foreground)]">ขับรถเที่ยวจาก {cityName}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-muted)]">
            {drive.intro} — กด copy แล้วเอา mapcode ไปกดใส่ car navi ของรถเช่าได้เลย
          </p>
        </div>
        <div className="nb-flat hidden shrink-0 p-3 text-[var(--nb-ink)] md:block">
          <Car className="h-5 w-5" aria-hidden />
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {drive.spots.map((spot) => (
          <div key={spot.name} className="nb-flat flex flex-col p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">{spot.name}</h3>
              <span className="nb-pill shrink-0">{spot.area}</span>
            </div>
            <p className="mt-2 flex-1 text-xs leading-5 text-[var(--ink-muted)]">{spot.note}</p>
            {spot.mapcode ? (
              <button
                type="button"
                onClick={() => copyMapcode(spot.name, spot.mapcode!)}
                className="mt-3 inline-flex items-center justify-between gap-2 rounded-[var(--nb-radius-sm)] border-2 border-[var(--nb-ink)] bg-[var(--surface-soft)] px-3 py-2 text-left transition hover:bg-[var(--nb-gold)]/20"
              >
                <span className="font-mono text-sm font-semibold tracking-wide text-[var(--nb-ink)]">{spot.mapcode}</span>
                {copiedSpot === spot.name ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--nb-matcha)]">
                    <Check className="h-3.5 w-3.5" aria-hidden /> คัดลอกแล้ว
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[var(--ink-muted)]">
                    <Copy className="h-3.5 w-3.5" aria-hidden /> copy
                  </span>
                )}
              </button>
            ) : spot.tel ? (
              <p className="mt-3 rounded-[var(--nb-radius-sm)] border-2 border-dashed border-[var(--nb-ink)] px-3 py-2 text-xs text-[var(--ink-muted)]">
                ค้นใน navi ด้วยเบอร์โทร: <span className="font-mono font-semibold text-[var(--nb-ink)]">{spot.tel}</span>
              </p>
            ) : (
              <p className="mt-3 rounded-[var(--nb-radius-sm)] border-2 border-dashed border-[var(--nb-ink)] px-3 py-2 text-xs leading-5 text-[var(--ink-muted)]">
                ยังไม่มี mapcode ที่ยืนยันได้ — ค้นจาก japanmapcode.com ก่อนเดินทาง
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="mt-4 px-1 text-xs leading-6 text-[var(--ink-muted)]">
        mapcode ส่วนใหญ่ชี้ไปที่ลานจอดรถของสถานที่ ถ้า navi ถามตัวเลขหลัง * ให้กดใส่ด้วยเพื่อความแม่นยำ • ที่มา: {drive.source}
      </p>
    </section>
  );
}
