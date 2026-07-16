// Card UI — สไตล์ loga board (ขอบหมึกหนา + pill สีทึบบอกสถานะ + เงาแข็ง) ปรับด้วย
// โทน washi/hanko ของ nagame แทนสีของ loga ต้นแบบ (--nb-vermilion/matcha/gold/indigo)
// ตาม docs/chat-cards-roadmap.md Phase 0 U6. ทุกการ์ดใช้ token เดิม (--nb-*) — ไม่เพิ่มสีใหม่.
//
// กฎ: การ์ด = ข้อมูลจริงที่ประกอบมาจาก advisor.ts (lib/chat/types.ts) ห้ามมี string
// ที่ประดิษฐ์ขึ้นในนี้ (ยกเว้นป้าย/label ของ UI เอง เช่น "สดเมื่อสักครู่").

import type { Card, EatCard, FlightCard, PlaceCard, StayCard, WeatherCard, WebcamCard } from "@/lib/chat/types";

// พื้นฐานการ์ดร่วม — ขอบหมึก 2.5px + มุมโค้งกลาง + เงาแข็ง (ตรงกับ .nb-card ทั้งระบบ)
const CARD_BASE =
  "w-[220px] shrink-0 overflow-hidden rounded-[var(--nb-radius-sm)] border-[var(--nb-border)] border-[var(--nb-ink)] bg-[var(--surface)] shadow-[var(--nb-shadow-sm)]";

// pill สีทึบ — เหมือน status pill ของ loga board แต่ใช้โทน hanko
function KindPill({ tone, children }: { tone: "vermilion" | "matcha" | "gold" | "indigo"; children: React.ReactNode }) {
  const bg =
    tone === "vermilion"
      ? "bg-[var(--nb-vermilion)]"
      : tone === "matcha"
        ? "bg-[var(--nb-matcha)]"
        : tone === "gold"
          ? "bg-[var(--nb-gold)]"
          : "bg-[var(--nb-indigo)]";
  return (
    <span className={`inline-block rounded-[6px] border-2 border-[var(--nb-ink)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white ${bg}`}>
      {children}
    </span>
  );
}

function StayCardView({ card }: { card: StayCard }) {
  return (
    <div className={CARD_BASE}>
      {card.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.imageUrl} alt={card.title} className="h-28 w-full object-cover" />
      ) : (
        <div className="flex h-28 w-full items-center justify-center bg-[var(--nb-vermilion-soft)] text-2xl">🏨</div>
      )}
      <div className="space-y-1.5 p-3">
        <KindPill tone="vermilion">พัก</KindPill>
        <p className="truncate text-sm font-bold text-[var(--foreground)]">{card.title}</p>
        {card.area ? <p className="truncate text-xs text-[var(--ink-muted)]">{card.area}</p> : null}
        <p className="font-serif text-lg text-[var(--foreground)]">
          {typeof card.pricePerNightThb === "number" ? `฿${card.pricePerNightThb.toLocaleString("th-TH")}` : "เช็คราคา"}
          <span className="ml-1 text-xs font-sans font-normal text-[var(--ink-muted)]">/คืน</span>
        </p>
        <a
          href={card.bookUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block rounded-[8px] border-2 border-[var(--nb-ink)] bg-[var(--nb-vermilion)] px-3 py-1.5 text-center text-xs font-bold text-white shadow-[2px_2px_0_0_var(--nb-ink)] transition hover:-translate-y-px"
        >
          เช็คห้องว่าง →
        </a>
      </div>
    </div>
  );
}

function EatCardView({ card }: { card: EatCard }) {
  return (
    <div className={CARD_BASE}>
      {card.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.imageUrl} alt={card.title} className="h-28 w-full object-cover" />
      ) : (
        <div className="flex h-28 w-full items-center justify-center bg-[var(--nb-matcha-soft)] text-2xl">🍜</div>
      )}
      <div className="space-y-1.5 p-3">
        <KindPill tone="matcha">กิน</KindPill>
        <p className="truncate text-sm font-bold text-[var(--foreground)]">{card.title}</p>
        {card.area ? <p className="truncate text-xs text-[var(--ink-muted)]">{card.area}</p> : null}
        {card.note ? <p className="line-clamp-2 text-xs leading-5 text-[var(--ink-muted)]">{card.note}</p> : null}
        <a
          href={card.mapUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block rounded-[8px] border-2 border-[var(--nb-ink)] bg-[var(--surface-soft)] px-3 py-1.5 text-center text-xs font-bold text-[var(--foreground)] shadow-[2px_2px_0_0_var(--nb-ink)] transition hover:-translate-y-px"
        >
          ดูแผนที่ →
        </a>
      </div>
    </div>
  );
}

function FlightCardView({ card }: { card: FlightCard }) {
  return (
    <div className={CARD_BASE}>
      <div className="space-y-1.5 p-3">
        <KindPill tone="gold">ตั๋วบิน</KindPill>
        <p className="truncate text-sm font-bold text-[var(--foreground)]">{card.route}</p>
        {card.period ? <p className="truncate text-xs text-[var(--ink-muted)]">{card.period}</p> : null}
        <p className="font-serif text-lg text-[var(--foreground)]">
          {typeof card.priceThb === "number" ? `฿${card.priceThb.toLocaleString("th-TH")}~` : "เช็คราคาไม่ได้ตอนนี้"}
        </p>
        {card.airline ? <p className="text-xs text-[var(--ink-muted)]">{card.airline}</p> : null}
        {card.note ? <p className="text-xs leading-5 text-[var(--ink-muted)]">{card.note}</p> : null}
        <a
          href={card.searchUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block rounded-[8px] border-2 border-[var(--nb-ink)] bg-[var(--nb-gold)] px-3 py-1.5 text-center text-xs font-bold text-[var(--nb-ink)] shadow-[2px_2px_0_0_var(--nb-ink)] transition hover:-translate-y-px"
        >
          ดูตั๋วช่วงนี้ →
        </a>
      </div>
    </div>
  );
}

function WebcamCardView({ card }: { card: WebcamCard }) {
  // ใช้ <a> ให้ตรงกับ card อื่น — window.open โดน popup blocker ได้ในบาง browser
  // (การ์ด stay/eat/flight ใช้ <a target=_blank> อยู่แล้ว เปิดปกติกว่า)
  return (
    <div className={CARD_BASE}>
      <a href={card.liveUrl} target="_blank" rel="noreferrer" className="block w-full text-left">
        <div className="relative h-28 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.previewImage} alt={card.title} className="h-full w-full object-cover" />
          <span className="absolute left-2 top-2 rounded-[6px] border-2 border-[var(--nb-ink)] bg-[var(--nb-indigo)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
            ● สดเมื่อสักครู่
          </span>
        </div>
        <div className="space-y-1.5 p-3">
          <KindPill tone="indigo">กล้องสด</KindPill>
          <p className="truncate text-sm font-bold text-[var(--foreground)]">{card.title}</p>
          <p className="text-xs font-bold text-[var(--nb-indigo)]">แตะเพื่อดูสด →</p>
        </div>
      </a>
    </div>
  );
}

function WeatherCardView({ card }: { card: WeatherCard }) {
  return (
    <div className={CARD_BASE}>
      <div className="space-y-1.5 p-3">
        <KindPill tone="indigo">อากาศ/ฤดู</KindPill>
        <p className="text-sm font-bold text-[var(--foreground)]">{card.cityName}</p>
        <p className="text-xs leading-5 text-[var(--foreground)]">{card.headline}</p>
        {card.tempRange ? <p className="font-serif text-lg text-[var(--foreground)]">{card.tempRange}</p> : null}
        {typeof card.rainChance === "number" ? (
          <p className="text-xs text-[var(--ink-muted)]">โอกาสฝน {card.rainChance}%</p>
        ) : null}
        {card.note ? <p className="text-xs leading-5 text-[var(--ink-muted)]">{card.note}</p> : null}
      </div>
    </div>
  );
}

function PlaceCardView({ card }: { card: PlaceCard }) {
  return (
    <div className={CARD_BASE}>
      {card.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.imageUrl} alt={card.title} className="h-28 w-full object-cover" />
      ) : (
        <div className="flex h-28 w-full items-center justify-center bg-[var(--surface-soft)] text-2xl">{card.emoji ?? "📍"}</div>
      )}
      <div className="space-y-1.5 p-3">
        <KindPill tone="matcha">เที่ยว</KindPill>
        <p className="truncate text-sm font-bold text-[var(--foreground)]">{card.title}</p>
        {card.area ? <p className="truncate text-xs text-[var(--ink-muted)]">{card.area}</p> : null}
        {card.note ? <p className="line-clamp-2 text-xs leading-5 text-[var(--ink-muted)]">{card.note}</p> : null}
        {card.mapUrl ? (
          <a
            href={card.mapUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block rounded-[8px] border-2 border-[var(--nb-ink)] bg-[var(--surface-soft)] px-3 py-1.5 text-center text-xs font-bold text-[var(--foreground)] shadow-[2px_2px_0_0_var(--nb-ink)] transition hover:-translate-y-px"
          >
            ดูแผนที่ →
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function CardList({ cards }: { cards: Card[] }) {
  if (!cards.length) return null;
  return (
    <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
      {cards.map((card) => (
        <CardOne key={card.id} card={card} />
      ))}
    </div>
  );
}

function CardOne({ card }: { card: Card }) {
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
