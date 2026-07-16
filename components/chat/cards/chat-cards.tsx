"use client";

// ChatCards — การ์ดญี่ปุ่นในแชท: loga board anatomy (ขอบหมึกหนา 2.5px + pill solid/outline
// + เงาแข็งไม่เบลอ) แต่ recolor เป็น hanko washi tokens ที่มีอยู่ (--nb-vermilion/matcha/
// gold/indigo บนพื้น --surface) แทน palette ตะวันตกจัดของ loga. ตาม design law ใน
// PROJECT_MEMORY: interactive/informational = washi-UI flat. ทุกปุ่มออกนอกใช้ buildOutbound แล้ว.

import { ExternalLink, MapPin, Star } from "lucide-react";
import type {
  Card,
  EatCard,
  FlightCard,
  PlaceCard,
  StayCard,
  WeatherCard,
  WebcamCard,
} from "@/lib/chat/types";

// กรอบการ์ดร่วม — ขอบหมึกหนา + เงาแข็ง (loga signature, recolor washi)
function CardFrame({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div
      className="overflow-hidden rounded-[var(--nb-radius-sm)] border-[2.5px] border-[var(--nb-ink)] bg-[var(--surface)] shadow-[var(--nb-shadow-sm)]"
      style={accent ? { borderTopWidth: 5, borderTopColor: accent } : undefined}
    >
      {children}
    </div>
  );
}

// pill solid (เหมือน loga priority) — พื้นสีทึบ ตัวอักษรตัดกัน
function SolidPill({ children, bg, fg = "#fff" }: { children: React.ReactNode; bg: string; fg?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-[6px] border-[2px] border-[var(--nb-ink)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.3px]"
      style={{ background: bg, color: fg }}
    >
      {children}
    </span>
  );
}

// ปุ่มออกนอกแอป (loga footer action) — href มาจาก buildOutbound แล้ว, เปิดแท็บใหม่
function OutboundButton({ href, children, solid }: { href: string; children: React.ReactNode; solid?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-[8px] border-[2px] border-[var(--nb-ink)] px-3 py-1.5 text-[12px] font-bold shadow-[2px_2px_0_0_var(--nb-ink)] transition hover:-translate-y-px ${
        solid ? "bg-[var(--nb-vermilion)] text-white" : "bg-[var(--surface)] text-[var(--foreground)]"
      }`}
    >
      {children}
      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
    </a>
  );
}

function bahtFormat(n: number): string {
  return `฿${n.toLocaleString("th-TH")}`;
}

function StayCardView({ card }: { card: StayCard }) {
  return (
    <CardFrame accent="var(--nb-vermilion)">
      {card.imageUrl ? (
        <div className="relative aspect-[16/9] overflow-hidden border-b-[2.5px] border-[var(--nb-ink)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.imageUrl} alt={card.title} className="h-full w-full object-cover" />
        </div>
      ) : null}
      <div className="space-y-2 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <SolidPill bg="var(--nb-vermilion)">🛏 ที่พัก</SolidPill>
            <p className="mt-1.5 truncate text-sm font-bold text-[var(--foreground)]">{card.title}</p>
            {card.area ? <p className="truncate text-xs text-[var(--ink-muted)]">{card.area}</p> : null}
          </div>
          {card.rating != null ? (
            <span className="flex shrink-0 items-center gap-0.5 text-xs font-bold text-[var(--nb-gold)]">
              <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
              {card.rating.toFixed(1)}
            </span>
          ) : null}
        </div>
        <div className="flex items-end justify-between gap-2">
          <div>
            {card.pricePerNightThb != null ? (
              <p className="font-serif text-xl font-bold text-[var(--foreground)]" style={{ fontVariantNumeric: "tabular-nums" }}>
                {bahtFormat(card.pricePerNightThb)}
                <span className="ml-1 text-xs font-normal text-[var(--ink-muted)]">/คืน</span>
              </p>
            ) : (
              <p className="text-xs text-[var(--ink-muted)]">ดูราคาที่หน้าจอง</p>
            )}
          </div>
          <OutboundButton href={card.bookUrl} solid>
            เช็คห้องว่าง
          </OutboundButton>
        </div>
      </div>
    </CardFrame>
  );
}

function EatCardView({ card }: { card: EatCard }) {
  return (
    <CardFrame accent="var(--nb-matcha)">
      {card.imageUrl ? (
        <div className="relative aspect-[16/9] overflow-hidden border-b-[2.5px] border-[var(--nb-ink)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.imageUrl} alt={card.title} className="h-full w-full object-cover" />
        </div>
      ) : null}
      <div className="space-y-2 p-3.5">
        <SolidPill bg="var(--nb-matcha)">🍜 ร้านอาหาร</SolidPill>
        <p className="truncate text-sm font-bold text-[var(--foreground)]">{card.title}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ink-muted)]">
          {card.cuisine ? <span>{card.cuisine}</span> : null}
          {card.priceLevel ? <span className="font-bold">{card.priceLevel}</span> : null}
          {card.rating != null ? (
            <span className="flex items-center gap-0.5 font-bold text-[var(--nb-gold)]">
              <Star className="h-3 w-3 fill-current" aria-hidden />
              {card.rating.toFixed(1)}
            </span>
          ) : null}
        </div>
        {card.note ? <p className="line-clamp-2 text-xs leading-5 text-[var(--ink-muted)]">{card.note}</p> : null}
        <OutboundButton href={card.mapUrl}>ดูร้าน</OutboundButton>
      </div>
    </CardFrame>
  );
}

function FlightCardView({ card }: { card: FlightCard }) {
  return (
    <CardFrame accent="var(--nb-gold)">
      <div className="space-y-2 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <SolidPill bg="var(--nb-gold)" fg="var(--nb-ink)">✈️ ตั๋วบิน</SolidPill>
          {card.period ? <span className="text-xs font-bold text-[var(--ink-muted)]">{card.period}</span> : null}
        </div>
        <p className="text-sm font-bold text-[var(--foreground)]" style={{ fontVariantNumeric: "tabular-nums" }}>
          {card.route}
        </p>
        <div className="flex items-end justify-between gap-2">
          {card.priceThb != null ? (
            <p className="font-serif text-xl font-bold text-[var(--foreground)]" style={{ fontVariantNumeric: "tabular-nums" }}>
              {bahtFormat(card.priceThb)}
              {card.airline ? <span className="ml-1 text-xs font-normal text-[var(--ink-muted)]">· {card.airline}</span> : null}
            </p>
          ) : (
            <p className="text-xs text-[var(--ink-muted)]">ดูราคาที่หน้าค้นหา</p>
          )}
          <OutboundButton href={card.searchUrl}>ดูตั๋ว</OutboundButton>
        </div>
      </div>
    </CardFrame>
  );
}

function WebcamCardView({ card }: { card: WebcamCard }) {
  return (
    <CardFrame accent="var(--nb-indigo)">
      <a href={card.liveUrl} target="_blank" rel="noreferrer" className="group block">
        <div className="relative aspect-[16/9] overflow-hidden border-b-[2.5px] border-[var(--nb-ink)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.previewImage} alt={card.title} className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(31,36,48,0.5))]" />
          <span className="absolute left-2 top-2">
            <SolidPill bg="var(--nb-vermilion)">● สดเมื่อสักครู่</SolidPill>
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--foreground)]">{card.title}</p>
            <p className="text-xs text-[var(--ink-muted)]">แตะเพื่อดูสด{card.source ? ` · ${card.source}` : ""}</p>
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 text-[var(--ink-muted)]" aria-hidden />
        </div>
      </a>
    </CardFrame>
  );
}

function WeatherCardView({ card }: { card: WeatherCard }) {
  return (
    <CardFrame accent="var(--nb-indigo)">
      <div className="space-y-1.5 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <SolidPill bg="var(--nb-indigo)">🌤 อากาศ/ฤดู</SolidPill>
          {card.rainChance != null ? (
            <span className={`text-xs font-bold ${card.rainChance >= 60 ? "text-[var(--nb-vermilion)]" : "text-[var(--ink-muted)]"}`}>
              ฝน {card.rainChance}%
            </span>
          ) : null}
        </div>
        <p className="text-sm font-bold text-[var(--foreground)]">{card.headline}</p>
        <div className="flex flex-wrap items-center gap-x-3 text-xs text-[var(--ink-muted)]">
          {card.tempRange ? <span style={{ fontVariantNumeric: "tabular-nums" }}>{card.tempRange}</span> : null}
          {card.season ? <span>ช่วง{card.season}</span> : null}
        </div>
        {card.note ? <p className="text-xs leading-5 text-[var(--ink-muted)]">{card.note}</p> : null}
      </div>
    </CardFrame>
  );
}

function PlaceCardView({ card }: { card: PlaceCard }) {
  return (
    <CardFrame>
      <div className="flex items-start gap-3 p-3.5">
        <span className="text-2xl leading-none" aria-hidden>{card.emoji ?? "📍"}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[var(--foreground)]">{card.title}</p>
          {card.area ? <p className="truncate text-xs text-[var(--ink-muted)]">{card.area}</p> : null}
          {card.note ? <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-[var(--ink-muted)]">{card.note}</p> : null}
          {card.mapUrl ? (
            <a
              href={card.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[var(--nb-indigo)] hover:underline"
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              ไปยังไง
            </a>
          ) : null}
        </div>
      </div>
    </CardFrame>
  );
}

// ตัว dispatcher — เลือก view ตาม kind (discriminated union → type-safe)
export function ChatCard({ card }: { card: Card }) {
  switch (card.kind) {
    case "stay":
      return <StayCardView card={card} />;
    case "eat":
      return <EatCardView card={card} />;
    case "flight":
      return <FlightCardView card={card} />;
    case "webcam":
      return <WebcamCardView card={card} />;
    case "weather":
      return <WeatherCardView card={card} />;
    case "place":
      return <PlaceCardView card={card} />;
  }
}

// แถวการ์ด — grid ยืดหยุ่นตามจำนวน (1 ใบ = เต็ม, หลายใบ = 2 คอลัมน์บนจอกว้าง)
export function ChatCardGrid({ cards }: { cards: Card[] }) {
  if (!cards.length) return null;
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {cards.map((card) => (
        <ChatCard key={card.id} card={card} />
      ))}
    </div>
  );
}
