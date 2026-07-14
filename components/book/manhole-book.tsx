"use client";

// ManholeBook — แท็บสมุดตรา reskin เป็นฝาท่อ マンホール (ก้าว C).
// อ่านสถานะตราจาก journal.ts เดิม (STAMP_KEYS 5 ดวง/เมือง, localStorage) — ไม่เปลี่ยน schema
// เก็บแล้ว = ฝาท่อสี + เงาแข็ง, ยังไม่เก็บ = โครงเทา + hint. ฝาท่อวาดด้วย SVG template ร่วม
// (frame + radial ribs เหมือนกันหมด, ต่างแค่ motif กลาง) ตาม [[nagame-v2-direction]].

import { useEffect, useState } from "react";
import {
  countStamps,
  getCityStamps,
  STAMP_KEYS,
  STAMP_META,
  STAMPS_PER_CITY,
  type CityStamps,
  type StampKey,
} from "@/lib/game/journal";
import { KruakAvatar } from "@/components/kruak-avatar";

// motif กลางฝาท่อของแต่ละตรา (SVG path/text, inspired-by ไม่ลอกลายเทศบาลจริง)
const MOTIF: Record<StampKey, (ink: string, accent: string) => string> = {
  visit: (ink, a) =>
    `<text y="9" font-size="26" font-weight="700" text-anchor="middle" fill="${a}" stroke="none" font-family="'Shippori Mincho',serif">⛩</text>`,
  chat: (ink, a) =>
    `<path d="M-13,-4 Q-13,-12 0,-12 Q13,-12 13,-4 Q13,3 3,3 L-2,9 L-3,3 Q-13,3 -13,-4 Z" fill="${a}" stroke="${ink}" stroke-width="1.4"/>`,
  webcam: (ink, a) =>
    `<circle cx="0" cy="0" r="9" fill="none" stroke="${ink}" stroke-width="1.6"/><circle cx="0" cy="0" r="4" fill="${a}" stroke="${ink}" stroke-width="1.2"/><rect x="-13" y="-9" width="26" height="18" rx="3" fill="none" stroke="${ink}" stroke-width="1.6"/>`,
  dayplan: (ink, a) =>
    `<rect x="-11" y="-9" width="22" height="20" rx="2" fill="none" stroke="${ink}" stroke-width="1.6"/><line x1="-11" y1="-3" x2="11" y2="-3" stroke="${ink}" stroke-width="1.4"/><circle cx="-5" cy="4" r="2" fill="${a}"/><circle cx="2" cy="4" r="2" fill="${a}"/>`,
  recs: (ink, a) =>
    `<path d="M-10,-2 Q-10,-10 0,-10 Q10,-10 10,-2 Z" fill="${a}" stroke="${ink}" stroke-width="1.4"/><line x1="-10" y1="-2" x2="10" y2="-2" stroke="${ink}" stroke-width="1.6"/><path d="M-2,-2 L-2,8 M2,-2 L2,8" stroke="${ink}" stroke-width="1.4"/>`,
};

function manholeSvg(key: StampKey, collected: boolean): string {
  const ink = collected ? "var(--nb-ink)" : "var(--ink-muted)";
  const fill = collected ? "var(--surface)" : "var(--surface-soft)";
  const ring = collected ? "var(--nb-vermilion)" : "var(--ink-muted)";
  const accent = collected ? "var(--nb-vermilion)" : "none";
  const op = collected ? "1" : "0.6";
  const ribs = Array.from({ length: 16 })
    .map((_, i) => {
      const a = (i * Math.PI) / 8;
      const x1 = (30 * Math.cos(a)).toFixed(1);
      const y1 = (30 * Math.sin(a)).toFixed(1);
      const x2 = (37 * Math.cos(a)).toFixed(1);
      const y2 = (37 * Math.sin(a)).toFixed(1);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    })
    .join("");
  return `<svg viewBox="-50 -50 100 100" xmlns="http://www.w3.org/2000/svg" style="opacity:${op};width:100%;height:100%">
    <circle r="47" fill="${fill}" stroke="${ink}" stroke-width="3"/>
    <circle r="42" fill="none" stroke="${ring}" stroke-width="2" stroke-dasharray="3 3"/>
    <circle r="38" fill="none" stroke="${ink}" stroke-width="1.5"/>
    <g stroke="${ink}" stroke-width="1" opacity="0.5">${ribs}</g>
    ${MOTIF[key](ink, accent)}
  </svg>`;
}

export function ManholeBook({ citySlug, cityName }: { citySlug: string; cityName: string }) {
  const [stamps, setStamps] = useState<CityStamps>({});

  useEffect(() => {
    setStamps(getCityStamps(citySlug));
  }, [citySlug]);

  const got = countStamps(stamps);
  const pct = Math.round((got / STAMPS_PER_CITY) * 100);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b-[2px] border-[var(--nb-ink)] bg-[var(--nb-matcha)] px-5 py-4 text-white">
        <div className="text-[12px] tracking-wide opacity-85">マンホール蓋コレクション · สมุดสะสมฝาท่อ</div>
        <div className="flex items-baseline gap-2 text-xl font-bold">
          {cityName}
          <span className="text-[13px] opacity-80">เก็บได้ {got} / {STAMPS_PER_CITY}</span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[12px]">
          <div className="h-2 max-w-[240px] flex-1 overflow-hidden rounded-full border-[1.5px] border-white/80">
            <div className="h-full bg-[var(--nb-gold)]" style={{ width: `${pct}%` }} />
          </div>
          <span>{pct}%</span>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-2 content-start gap-5 overflow-y-auto p-5 sm:grid-cols-3">
        {STAMP_KEYS.map((key) => {
          const collected = Boolean(stamps[key]);
          const meta = STAMP_META[key];
          return (
            <div key={key} className="text-center">
              <div
                className="mx-auto aspect-square w-full max-w-[128px]"
                dangerouslySetInnerHTML={{ __html: manholeSvg(key, collected) }}
              />
              <div className={`mt-2 text-[13px] font-bold ${collected ? "" : "text-[var(--ink-muted)]"}`}>
                {meta.label}
              </div>
              {!collected ? (
                <div className="mt-0.5 text-[11px] font-bold text-[var(--nb-vermilion)]">🔓 {meta.hint}</div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 border-t-[2px] border-[var(--nb-ink)] bg-[var(--nb-gold)] px-5 py-3.5">
        <KruakAvatar art={got >= STAMPS_PER_CITY ? "sunny" : "worried"} className="!h-11 !w-11" />
        <p className="m-0 text-[13px] font-bold text-[var(--nb-ink)]">
          {got >= STAMPS_PER_CITY
            ? "ครบทุกฝาแล้ว! เก่งมากเลยครับ 🎉"
            : `อีก ${STAMPS_PER_CITY - got} ฝาก็ครบ${cityName}แล้ว ลุยต่อกันนะ 🐾`}
        </p>
      </div>
    </div>
  );
}
