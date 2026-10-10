"use client";

// Tabi V1-lite: one conversation drives five screens (mockup 1–5).
// The server is stateless; this component owns trip context and sends it each turn.

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUp, CalendarDays, ChevronLeft, Heart, Home, Map as MapIcon, Pencil, Plane, Plus, User } from "lucide-react";
import { TABI_ART, type TabiMood } from "@/lib/tabi/mascot";
import { listTrips, newTrip, saveTrip, type SavedTrip } from "@/lib/tabi/store";
import type { Highlight, RouteOption, TabiReply } from "@/lib/tabi/types";
import type { MapPoint } from "./tabi-map";
import "./tabi.css";

const TabiMap = dynamic(() => import("./tabi-map").then((m) => m.TabiMap), {
  ssr: false,
  loading: () => <div className="h-[220px] animate-pulse rounded-[18px] bg-[var(--t-blue-soft)]" />,
});

type Screen = "home" | "chat" | "route" | "itinerary" | "flights" | "trips" | "soon";
type Turn = { role: "user" | "tabi"; text: string; reply?: TabiReply };

const INSPIRATION = [
  { label: "ดูใบไม้ผลิ", emoji: "🌸", prompt: "อยากไปดูซากุระ ช่วง เม.ย. 5 วัน" },
  { label: "หิมะ", emoji: "❄️", prompt: "อยากเห็นหิมะ ช่วง ม.ค. 6 วัน" },
  { label: "ออนเซ็น", emoji: "♨️", prompt: "อยากแช่ออนเซ็น เที่ยวสบาย ๆ 5 วัน" },
];
const IDEAS = [
  { title: "Tokyo", sub: "เมืองใหญ่ ผสมของใหม่กับวัฒนธรรม", wiki: "Tokyo", prompt: "อยากเที่ยวโตเกียว 5 วัน ไปครั้งแรก" },
  { title: "Tateyama", sub: "กำแพงหิมะช่วง เม.ย.–มิ.ย.", wiki: "Tateyama Kurobe Alpine Route", prompt: "อยากไปทาเตยามะ ดูกำแพงหิมะ พ.ค. 5 วัน" },
  { title: "Kyoto", sub: "วัดสวย ใบไม้เปลี่ยนสี", wiki: "Kyoto", prompt: "อยากไปเกียวโต ดูใบไม้เปลี่ยนสี พ.ย. 5 วัน" },
];

/** Errors whose Thai message came from /api/tabi and is safe to show as-is. */
class ApiError extends Error {}

const img = (wikiTitle: string) => `/api/tabi/image?title=${encodeURIComponent(wikiTitle)}`;
/** No Wikipedia image → hide the <img>; the .tabi-img gradient behind it stays as the fallback. */
const hideBroken = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.visibility = "hidden";
};

export function TabiApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selected, setSelected] = useState<RouteOption | null>(null);
  const [trip, setTrip] = useState<SavedTrip | null>(null);
  const [lastReply, setLastReply] = useState<TabiReply | null>(null);
  const [trips, setTrips] = useState<SavedTrip[]>([]);

  useEffect(() => { listTrips().then(setTrips); }, []);

  const persist = useCallback(async (next: SavedTrip) => {
    setTrip(next);
    await saveTrip(next);
    setTrips(await listTrips());
  }, []);

  const send = useCallback(async (message: string) => {
    const text = message.trim();
    if (!text || loading) return;
    setError(null);
    setTurns((t) => [...t, { role: "user", text }]);
    setScreen((s) => (s === "home" || s === "trips" ? "chat" : s));
    setLoading(true);
    const route = selected ?? trip?.route;
    const tripForRoute = trip && route && trip.route?.id === route.id ? trip : null;
    try {
      const res = await fetch("/api/tabi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({
          message: text,
          context: {
            intent: lastReply?.intent ?? trip?.intent,
            shownRoutes: routes.map(({ id, title }) => ({ id, title })),
            selectedRoute: route,
            savedStopIds: tripForRoute?.savedStops.map((s) => s.id) ?? [],
          },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: TabiReply; error?: string };
      if (!res.ok || !data.reply) throw new ApiError(data.error ?? "ทาบิตอบไม่ได้ตอนนี้ ลองส่งใหม่อีกครั้งนะ");
      const reply = data.reply;
      setLastReply(reply);
      setTurns((t) => [...t, { role: "tabi", text: reply.bubbles.join("\n"), reply }]);

      if (reply.action === "suggest_routes" && reply.routes) {
        setRoutes(reply.routes);
        setScreen("chat");
      } else if (reply.action === "open_route" && reply.openRouteId) {
        const r = routes.find((x) => x.id === reply.openRouteId);
        if (r) openRoute(r);
      } else if (reply.action === "suggest_stops") {
        setScreen("route");
      } else if (reply.action === "draft_itinerary" && reply.itinerary) {
        // the server may re-fit nights to the requested days → keep its route
        const fitted = reply.selectedRoute ?? route;
        if (fitted) setSelected(fitted);
        const base = tripForRoute ?? newTrip(reply.intent);
        await persist({ ...base, intent: reply.intent, route: fitted, itinerary: reply.itinerary, status: "draft", title: titleFor(fitted, reply.itinerary.length) });
        setScreen("itinerary");
      } else if (reply.action === "flights") {
        setScreen("flights");
      } else {
        setScreen("chat");
      }
    } catch (e) {
      const timedOut = e instanceof DOMException && e.name === "TimeoutError";
      setError(e instanceof ApiError ? e.message : timedOut ? "ทาบิตอบช้ากว่าปกติ ลองส่งใหม่อีกครั้งนะ" : "เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองส่งใหม่อีกครั้งนะ");
    } finally {
      setLoading(false);
    }
  }, [loading, lastReply, trip, routes, selected, persist]);

  /** Viewing a route never creates a trip; a trip is saved only when the user keeps something. */
  function openRoute(r: RouteOption) {
    setSelected(r);
    setScreen("route");
  }

  function addStop(h: Highlight) {
    if (!selected) return;
    const base = trip && trip.route?.id === selected.id ? trip : newTrip(lastReply?.intent ?? trip?.intent ?? { preferences: [], focus: [] });
    if (base.savedStops.some((s) => s.id === h.id)) return;
    void persist({ ...base, route: selected, title: titleFor(selected), savedStops: [...base.savedStops, h] });
  }

  function openTrip(t: SavedTrip) {
    setTrip(t);
    setSelected(t.route ?? null);
    setRoutes(t.route ? [t.route] : []);
    setLastReply(null);
    setScreen(t.itinerary ? "itinerary" : t.route ? "route" : "chat");
  }

  const nav = (s: Screen) => () => setScreen(s);

  return (
    <div className="tabi">
      <div className="tabi-shell">
        {screen === "home" && <HomeScreen onAsk={send} />}
        {screen === "chat" && (
          <ChatScreen turns={turns} loading={loading} error={error} routes={routes} onAsk={send} onPick={openRoute} onBack={nav("home")} />
        )}
        {screen === "route" && selected && (
          <RouteScreen
            route={selected}
            reply={lastReply}
            savedIds={new Set(trip?.route?.id === selected.id ? trip.savedStops.map((s) => s.id) : [])}
            loading={loading}
            onBack={nav("chat")}
            onAdd={addStop}
            onAsk={send}
          />
        )}
        {screen === "itinerary" && trip?.itinerary && (
          <ItineraryScreen
            trip={trip}
            onBack={nav("route")}
            onAsk={send}
            onMap={nav("route")}
            onToggle={(id) => persist({ ...trip, checklist: trip.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)) })}
            onSetDate={(iso) => {
              // the date fixes month and length too, so the next turn (e.g. "หาตั๋ว") searches these exact days
              const intent = { ...trip.intent, startDate: iso, month: Number(iso.slice(5, 7)), durationDays: trip.itinerary?.length ?? trip.intent.durationDays };
              void persist({ ...trip, intent, status: "planned" });
              setLastReply((r) => (r ? { ...r, intent } : r));
            }}
          />
        )}
        {screen === "flights" && <FlightsScreen reply={lastReply} trip={trip} onBack={nav(trip?.itinerary ? "itinerary" : "chat")} onChat={nav("chat")} onPickDate={nav("itinerary")} />}
        {screen === "trips" && <TripsScreen trips={trips} onOpen={openTrip} onNew={nav("home")} />}
        {screen === "soon" && <SoonScreen />}
      </div>

      <nav className="tabi-nav" aria-label="เมนูหลัก">
        <div className="tabi-nav-inner">
          <NavButton icon={<Home size={22} />} label="หน้าแรก" active={screen === "home"} onClick={nav("home")} />
          <NavButton icon={<MapIcon size={22} />} label="วางแผนทริป" active={["chat", "route", "itinerary", "flights", "trips"].includes(screen)} onClick={nav(turns.length ? "chat" : "trips")} />
          <NavButton icon={<Heart size={22} />} label="ทริปของฉัน" active={false} onClick={nav("trips")} />
          <NavButton icon={<User size={22} />} label="โปรไฟล์" active={screen === "soon"} onClick={nav("soon")} />
        </div>
      </nav>
    </div>
  );
}

function titleFor(route: RouteOption | undefined, days?: number) {
  if (!route) return "ทริปญี่ปุ่น";
  const nights = route.stops.reduce((a, s) => a + s.nights, 0);
  return `${route.stops[0].city} → ${route.stops[route.stops.length - 1].city} · ${days ?? nights + 1} วัน`;
}

// ── shared bits ──
/** `animated` plays the 12-frame three.js loop (breathe, sway, tail wag, blink) when one exists for the mood. */
function Avatar({ mood = "idle", size = 44, wag = false, animated = false }: { mood?: TabiMood; size?: number; wag?: boolean; animated?: boolean }) {
  const art = TABI_ART[mood];
  const sprite = animated && "sprite" in art ? art.sprite : null;
  return (
    <span className="relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white bg-[var(--t-sakura)] shadow-[var(--t-shadow-sm)]" style={{ width: size, height: size }}>
      {sprite ? (
        <span className="tabi-sprite" role="img" aria-label={art.alt}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sprite} alt="" />
        </span>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={art.face} alt={art.alt} className={`h-full w-full object-cover ${wag ? "tabi-wag" : ""}`} />
      )}
    </span>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? "page" : undefined}>
      {icon}
      {label}
    </button>
  );
}

/** Brand mark (mockup header): snow-capped Fuji with a sakura sun. Decorative. */
function FujiMark() {
  return (
    <svg width="40" height="28" viewBox="0 0 40 28" aria-hidden className="shrink-0">
      <circle cx="29" cy="8" r="6" fill="#ffc6db" />
      <path d="M2 27 L16 6 Q20 2 24 6 L38 27 Z" fill="#2d7ff9" />
      <path d="M12 12 L16 6 Q20 2 24 6 L28 12 L25 10.5 L22 13 L20 10.5 L17 13 L15 10.5 Z" fill="#fff" />
    </svg>
  );
}

/** Thai tag → small icon, as on the mockup's route cards. */
/** Day markers, as on the mockup timeline (decorative; the "Day N" label carries meaning). */
const DAY_COLORS = ["#22b07d", "#ff9e45", "#2d7ff9", "#ff5c9d", "#a66cff"];

const TAG_ICON: Record<string, string> = {
  ธรรมชาติ: "🌿", หิมะ: "❄️", ออนเซ็น: "♨️", สายกิน: "🍜", ช้อปปิ้ง: "🛍️", "วัด-ปราสาท": "⛩️",
  คนน้อย: "👥", เดินทางง่าย: "🚆", พาเด็กได้: "👨‍👩‍👧", วิวถ่ายรูป: "📷",
};

function TopBar({ onBack, right }: { onBack?: () => void; right?: React.ReactNode }) {
  return (
    <header className="mb-4 flex items-center gap-3">
      {onBack && (
        <button type="button" onClick={onBack} aria-label="ย้อนกลับ" className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-[var(--t-shadow-sm)]">
          <ChevronLeft size={22} />
        </button>
      )}
      <div className="flex flex-1 items-center gap-2">
        <FujiMark />
        <div>
          <p className="tabi-title text-[22px] font-bold leading-none tracking-tight">Nagame</p>
          <p className="tabi-muted text-xs">วางทริปญี่ปุ่นกับทาบิ</p>
        </div>
      </div>
      {right}
    </header>
  );
}

function Composer({ onAsk, loading, placeholder = "บอกทาบิเพิ่มได้เลย…" }: { onAsk: (m: string) => void; loading: boolean; placeholder?: string }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        onAsk(value);
        setValue("");
      }}
    >
      <label className="sr-only" htmlFor="tabi-composer">ข้อความถึงทาบิ</label>
      <input id="tabi-composer" className="tabi-input" value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} maxLength={300} autoComplete="off" />
      <button type="submit" disabled={loading || !value.trim()} aria-label="ส่ง" className="absolute right-1 top-1 grid h-11 w-11 place-items-center rounded-full bg-[var(--t-blue)] text-white disabled:opacity-40">
        <ArrowUp size={20} />
      </button>
    </form>
  );
}

function Chips({ items, onPick }: { items: string[]; onPick: (s: string) => void }) {
  return (
    <div className="tabi-scroll-x">
      {items.map((c) => (
        <button key={c} type="button" className="tabi-chip" onClick={() => onPick(c)}>{c}</button>
      ))}
    </div>
  );
}

// ── 1. Home ──
function HomeScreen({ onAsk }: { onAsk: (m: string) => void }) {
  return (
    <div className="tabi-rise space-y-6">
      <TopBar />
      {/* Hero (mockup 1): Fuji + Chūreitō pagoda; a light wash keeps the heading readable */}
      <section className="relative -mx-4 overflow-hidden sm:mx-0 sm:rounded-[28px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img("Arakurayama Sengen Park")} alt="" onError={hideBroken} className="tabi-img h-[300px] w-full object-[50%_70%]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(247,251,255,.97)] via-[rgba(247,251,255,.7)] to-transparent" />
        <div className="absolute inset-x-0 top-0 px-4 pt-3 sm:px-5">
          <h1 className="text-[34px] font-bold leading-[1.15] tracking-tight">เริ่มวางแผน<br />ทริปญี่ปุ่น 🌸</h1>
          <p className="mt-2 max-w-[260px] font-medium text-[var(--t-navy)]">บอกทาบิว่าอยากไปช่วงไหน กี่วัน และชอบเที่ยวแนวไหน</p>
        </div>
        <p className="absolute bottom-2 right-3 rounded-full bg-black/40 px-2 text-[10px] text-white">ภาพ: Wikipedia</p>
      </section>
      <div className="flex items-center gap-3">
        <Avatar size={52} animated />
        <div className="flex-1"><Composer onAsk={onAsk} loading={false} placeholder="เช่น 5 วัน พ.ค. เน้นธรรมชาติ" /></div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {INSPIRATION.map((c) => (
          <button key={c.label} type="button" className="tabi-chip justify-center" onClick={() => onAsk(c.prompt)}>
            <span aria-hidden>{c.emoji}</span>{c.label}
          </button>
        ))}
      </div>
      <section>
        <h2 className="mb-3 text-lg font-bold">แรงบันดาลใจจากญี่ปุ่น</h2>
        <div className="tabi-scroll-x -mx-4 px-4">
          {IDEAS.map((idea) => (
            <button key={idea.title} type="button" onClick={() => onAsk(idea.prompt)} className="tabi-card w-[180px] shrink-0 overflow-hidden text-left">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img(idea.wiki)} alt="" loading="lazy" onError={hideBroken} className="tabi-img h-[110px] w-full" />
              <div className="p-3">
                <p className="tabi-title font-bold">{idea.title}</p>
                <p className="tabi-muted text-xs leading-snug">{idea.sub}</p>
              </div>
            </button>
          ))}
        </div>
        <p className="tabi-muted mt-1 text-[11px]">ภาพ: Wikipedia</p>
      </section>
      <section className="tabi-card flex gap-3 bg-[var(--t-sakura)] p-4">
        <Avatar size={56} mood="happy" animated />
        <div>
          <p className="font-bold text-[var(--t-pink-ink)]">สวัสดี! ทาบิเองนะ</p>
          <p className="text-sm">ทาบิจะเสนอเส้นทางไม่เกิน 3 แบบ เลือกแล้วจัดเป็นแผนรายวันให้ ปรับได้ด้วยการพิมพ์บอก</p>
        </div>
      </section>
    </div>
  );
}

// ── 2. Conversation + route options ──
function ChatScreen({ turns, loading, error, routes, onAsk, onPick, onBack }: {
  turns: Turn[]; loading: boolean; error: string | null; routes: RouteOption[];
  onAsk: (m: string) => void; onPick: (r: RouteOption) => void; onBack: () => void;
}) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns.length, loading]);
  const last = [...turns].reverse().find((t) => t.reply)?.reply;
  const points: MapPoint[] = useMemo(() => (routes[0] ? routes[0].stops.map((s) => ({ lat: s.lat, lon: s.lon, label: s.city, kind: "stop" as const })) : []), [routes]);

  return (
    <div className="space-y-4">
      <TopBar onBack={onBack} />
      <ol className="space-y-3" aria-live="polite">
        {turns.map((t, i) =>
          t.role === "user" ? (
            <li key={i} className="tabi-rise flex justify-end">
              <p className="max-w-[80%] rounded-[20px] rounded-br-md bg-[var(--t-blue)] px-4 py-2.5 text-white">{t.text}</p>
            </li>
          ) : (
            <li key={i} className="tabi-rise flex items-start gap-2">
              <Avatar size={38} mood={t.reply?.action === "ask" ? "worried" : "idle"} />
              <div className="max-w-[82%] space-y-1">
                <p className="text-xs font-semibold text-[var(--t-pink-ink)]">ทาบิ</p>
                {t.text.split("\n").map((b, j) => (
                  <p key={j} className="tabi-card rounded-tl-md px-4 py-2.5">{b}</p>
                ))}
              </div>
            </li>
          ),
        )}
        {loading && (
          <li className="flex items-center gap-2">
            <Avatar size={38} animated />
            <span className="tabi-card tabi-typing px-4 py-3" aria-label="ทาบิกำลังคิด"><span /><span /><span /></span>
          </li>
        )}
      </ol>
      {error && <p role="alert" className="rounded-2xl bg-[#fff1e6] px-4 py-3 text-sm text-[#a5521a]">{error}</p>}

      {last?.action === "suggest_routes" && routes.length > 0 && (
        <section className="space-y-3" aria-label="เส้นทางที่ทาบิแนะนำ">
          {routes.map((r, i) => <RouteCard key={r.id} route={r} index={i} onPick={() => onPick(r)} />)}
          <p className="tabi-muted text-[11px]">ภาพ: Wikipedia · เวลาเดินทางเป็นค่าประมาณ</p>
          <div className="tabi-card p-3">
            <p className="mb-2 text-sm font-semibold">แผนที่ของเส้นทางที่ 1</p>
            <TabiMap points={points} height={170} interactive={false} />
            <button type="button" className="tabi-btn tabi-btn--soft mt-2 w-full" onClick={() => onPick(routes[0])}>
              <MapIcon size={18} />ดูเส้นทางนี้แบบเต็ม
            </button>
          </div>
        </section>
      )}
      {last?.ask && <Chips items={last.ask.chips} onPick={onAsk} />}
      {last?.flight && <FlightCard link={last.flight} />}
      {!last?.ask && last?.chips && <Chips items={last.chips} onPick={onAsk} />}
      <div ref={end} className="h-16" aria-hidden />
      <div className="sticky bottom-[84px] pt-2"><Composer onAsk={onAsk} loading={loading} /></div>
    </div>
  );
}

function RouteCard({ route, index, onPick }: { route: RouteOption; index: number; onPick: () => void }) {
  const [chosen, setChosen] = useState(false);
  const hero = route.highlights[0];
  return (
    <button
      type="button"
      onClick={() => { setChosen(true); setTimeout(onPick, 220); }}
      className={`tabi-card tabi-rise flex w-full overflow-hidden text-left ${chosen ? "tabi-select ring-2 ring-[var(--t-blue)]" : ""}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="relative w-[34%] shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {hero && <img src={img(hero.wikiTitle)} alt="" loading="lazy" onError={hideBroken} className="tabi-img absolute inset-0 h-full w-full" />}
        <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white text-sm font-bold text-[var(--t-blue)] shadow">{index + 1}</span>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5 p-3">
        <div className="flex items-start gap-2">
          <p className="tabi-title flex-1 font-bold leading-snug">{route.title}</p>
          {route.recommended && <span className="shrink-0 rounded-full bg-[var(--t-sakura)] px-2 py-0.5 text-[11px] font-semibold text-[var(--t-pink-ink)]">แนะนำสุด</span>}
        </div>
        <p className="tabi-muted text-[13px] leading-snug">{route.reason}</p>
        {route.tradeoff && <p className="text-[12px] text-[#a5521a]">ข้อแลก: {route.tradeoff}</p>}
        <div className="flex flex-wrap gap-1">
          {route.tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[var(--t-green)] px-2 py-0.5 text-[11px] text-[var(--t-green-ink)]">
              {TAG_ICON[t] && <span aria-hidden>{TAG_ICON[t]}</span>}{t}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

// ── 3. Route + map ──
function RouteScreen({ route, reply, savedIds, loading, onBack, onAdd, onAsk }: {
  route: RouteOption; reply: TabiReply | null; savedIds: Set<string>; loading: boolean;
  onBack: () => void; onAdd: (h: Highlight) => void; onAsk: (m: string) => void;
}) {
  const stops = reply?.action === "suggest_stops" && reply.stops?.length ? reply.stops : route.highlights;
  const points: MapPoint[] = useMemo(
    () => [
      ...route.stops.map((s) => ({ lat: s.lat, lon: s.lon, label: s.city, kind: "stop" as const })),
      ...stops.map((h) => ({ lat: h.lat, lon: h.lon, label: h.name, kind: "place" as const })),
    ],
    [route, stops],
  );
  return (
    <div className="tabi-rise space-y-4">
      <TopBar
        onBack={onBack}
        right={
          <button type="button" className="tabi-btn tabi-btn--soft px-3 text-sm" disabled={loading} onClick={() => onAsk("เสนอเส้นทางแบบอื่น")}>
            <Pencil size={16} />ปรับเส้นทาง
          </button>
        }
      />
      <section>
        <h1 className="text-2xl font-bold">เส้นทางที่แนะนำ</h1>
        <p className="tabi-muted">{route.stops.map((s) => `${s.cityTh} ${s.nights} คืน`).join(" → ")}</p>
      </section>
      {/* city strip with a photo per stop (mockup 3) */}
      <ol className="tabi-card tabi-scroll-x items-start p-3" aria-label="ลำดับเมือง">
        {route.stops.map((s, i) => {
          const photo = route.highlights.find((h) => h.city === s.city)?.wikiTitle ?? s.city;
          return (
            <li key={s.city} className="flex shrink-0 items-center gap-2">
              <div className="w-[96px] text-center">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img(photo)} alt="" loading="lazy" onError={hideBroken} className="tabi-img h-[68px] w-[96px] rounded-[14px]" />
                  <span className="absolute -left-1 -top-1 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-[var(--t-blue)] text-xs font-bold text-white">{i + 1}</span>
                </div>
                <p className="mt-1 text-sm font-bold leading-tight">{s.city}</p>
                <p className="tabi-muted text-xs">{s.cityTh}</p>
              </div>
              {i < route.stops.length - 1 && <ArrowRight size={16} className="tabi-muted -mt-8" aria-hidden />}
            </li>
          );
        })}
      </ol>
      <div className="tabi-card p-2"><TabiMap points={points} height={240} /></div>
      <section className="tabi-card flex gap-3 bg-[var(--t-sakura)] p-4">
        <Avatar size={48} mood="happy" animated />
        <div>
          <p className="font-bold text-[var(--t-pink-ink)]">มุมมองจากทาบิ</p>
          <p className="text-sm">{route.reason}{route.tradeoff ? ` · ข้อแลก: ${route.tradeoff}` : ""}</p>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-bold">{reply?.action === "suggest_stops" ? "จุดแวะที่ทาบิหาเพิ่มให้" : "จุดเด่นระหว่างทาง"}</h2>
        {stops.map((h) => {
          const saved = savedIds.has(h.id);
          return (
            <article key={h.id} className="tabi-card tabi-rise flex gap-3 overflow-hidden p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img(h.wikiTitle)} alt="" loading="lazy" onError={hideBroken} className="tabi-img h-[88px] w-[96px] shrink-0 rounded-[14px]" />
              <div className="min-w-0 flex-1 py-1">
                <p className="tabi-title font-bold leading-snug">{h.name}</p>
                {h.nameJa && <p className="tabi-muted text-xs">{h.nameJa}</p>}
                <p className="tabi-muted text-xs">{h.approxDetourMin ? `จาก ${h.city} ประมาณ ${h.approxDetourMin} นาที` : `อยู่ใน ${h.city}`}{h.reason ? ` · ${h.reason}` : ""}</p>
              </div>
              <button type="button" onClick={() => onAdd(h)} disabled={saved} className={`tabi-btn self-center px-3 text-sm ${saved ? "tabi-btn--soft" : "tabi-btn--soft"}`} aria-label={saved ? `${h.name} อยู่ในทริปแล้ว` : `ใส่ ${h.name} ในทริป`}>
                {saved ? <span className="tabi-pop">✓ ในทริป</span> : <><Plus size={16} />ใส่ในทริป</>}
              </button>
            </article>
          );
        })}
        <p className="tabi-muted text-[11px]">ภาพ: Wikipedia</p>
      </section>
      <button type="button" className="tabi-btn tabi-btn--primary w-full" disabled={loading} onClick={() => onAsk("จัดเป็นแผนรายวันให้หน่อย")}><CalendarDays size={18} />จัดแผนรายวัน</button>
      <Chips items={["ขอแวะออนเซ็นระหว่างทาง", "ขอแวะที่คนน้อย", "ขอแวะที่วิวสวยถ่ายรูป"]} onPick={onAsk} />
    </div>
  );
}

// ── 4. Draft itinerary (video-style stepper + timeline) ──
const MONTH_SHORT = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const WEEKDAY_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const SLOT_TH = { morning: "เช้า", afternoon: "บ่าย", evening: "เย็น" } as const;
/** Coloured chips per step, as in the video's timeline (taxi / subway / flight labels). */
const CHIP = {
  flight: { label: "✈️ เครื่องบิน", bg: "#e8f1ff", fg: "#1a66d9" },
  train: { label: "🚆 รถไฟ", bg: "#e8f8f0", fg: "#17734b" },
  airport: { label: "🧳 ไปสนามบิน", bg: "#fff1e6", fg: "#a5521a" },
  see: { label: "📍 เที่ยว", bg: "#ffe9f2", fg: "#c2185b" },
  stay: { label: "🛏️ ที่พัก", bg: "#eef1f7", fg: "#4b5878" },
} as const;

const isoDay = (iso: string, plus = 0) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + plus);
  return d;
};
const thaiDate = (d: Date) => `${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth() + 1]}`;
const todayIso = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

function ItineraryScreen({ trip, onBack, onAsk, onMap, onToggle, onSetDate }: {
  trip: SavedTrip; onBack: () => void; onAsk: (m: string) => void; onMap: () => void; onToggle: (id: string) => void;
  onSetDate: (iso: string) => void;
}) {
  const days = trip.itinerary ?? [];
  const [active, setActive] = useState(0);
  const month = trip.intent.month;
  const start = trip.intent.startDate;
  const countdown = start ? Math.round((isoDay(start).getTime() - isoDay(todayIso()).getTime()) / 86_400_000) : null;
  return (
    <div className="tabi-rise space-y-4">
      <TopBar onBack={onBack} />
      <section className="tabi-card overflow-hidden">
        <div className="relative h-[120px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {trip.route?.highlights[0] && <img src={img(trip.route.highlights[0].wikiTitle)} alt="" onError={hideBroken} className="tabi-img absolute inset-0 h-full w-full" />}
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(12,31,74,.75)] to-transparent" />
          <div className="absolute bottom-3 left-4 text-white" data-on-image>
            <p className="tabi-title text-xl font-bold">{trip.title}</p>
            <p className="text-sm opacity-90">
              {days.length} วัน {days.length - 1} คืน
              {start ? ` · ${thaiDate(isoDay(start))} – ${thaiDate(isoDay(start, days.length - 1))}` : month ? ` · ช่วง ${MONTH_SHORT[month]}` : ""}
            </p>
          </div>
        </div>
        {/* departure date: unlocks real dates on the stepper, the countdown and dated flight searches */}
        <div className="flex flex-wrap items-center gap-3 p-3">
          {countdown !== null && countdown >= 0 && (
            <span key={start} className="tabi-pop rounded-full bg-[#ffd166] px-3 py-1 text-sm font-bold text-[var(--t-navy)]">
              {countdown === 0 ? "ออกเดินทางวันนี้!" : `อีก ${countdown} วันออกเดินทาง`}
            </span>
          )}
          <label className="flex min-h-[44px] flex-1 items-center gap-2 text-sm">
            <CalendarDays size={18} className="text-[var(--t-blue)]" aria-hidden />
            <span className="shrink-0">วันออกเดินทาง</span>
            <input
              type="date"
              min={todayIso()}
              value={start ?? ""}
              onChange={(e) => e.target.value && onSetDate(e.target.value)}
              className="min-h-[40px] flex-1 rounded-xl border border-[var(--t-line)] bg-white px-2"
            />
          </label>
        </div>
      </section>
      <section className="tabi-card flex gap-3 bg-[var(--t-sakura)] p-4">
        <Avatar size={44} mood="happy" />
        <p className="text-sm"><b className="text-[var(--t-pink-ink)]">นี่คือร่างทริปคร่าว ๆ</b> เวลาเดินทางเป็นค่าประมาณ บอกทาบิให้ปรับได้ตลอดนะ</p>
      </section>

      <section className="tabi-card px-2 pb-3">
        <div className="tabi-stepper" role="group" aria-label="เลือกวัน">
          <span className="tabi-stepper-rider" style={{ left: `${((active + 0.5) / days.length) * 100}%` }} aria-hidden>
            <Avatar size={40} animated />
          </span>
          {days.map((d, i) => {
            const date = start ? isoDay(start, i) : null;
            return (
              <button key={d.day} type="button" aria-pressed={i === active} onClick={() => setActive(i)} aria-label={date ? `วันที่ ${d.day} ${thaiDate(date)}` : `วันที่ ${d.day}`}>
                <span className="dot" />
                <span className={i === active ? "rounded-full bg-[var(--t-sakura)] px-2 text-[var(--t-pink-ink)]" : ""}>{date ? thaiDate(date) : `วัน ${d.day}`}</span>
                {date && <span className="-mt-1 text-[11px]">{WEEKDAY_SHORT[date.getUTCDay()]}</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* every day at a glance with a photo (mockup 4); the active day opens its timeline */}
      <section className="tabi-card p-3" aria-label="ร่างแผนการเดินทาง">
        <h2 className="mb-2 flex items-center justify-between px-1 font-bold">
          ร่างแผนการเดินทาง
          <span className="tabi-muted rounded-full bg-[var(--t-blue-soft)] px-2 py-0.5 text-xs font-medium">{days.length} วัน {days.length - 1} คืน</span>
        </h2>
        <ol>
          {days.map((d, i) => {
            const open = i === active;
            const sights = d.items.filter((it) => it.kind === "see").map((it) => it.text);
            return (
              <li key={d.day} className="relative border-t border-[var(--t-line)] first:border-t-0">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setActive(i)}
                  className="flex w-full items-center gap-3 rounded-[16px] px-1 py-3 text-left transition-colors"
                  style={open ? { background: `${DAY_COLORS[i % DAY_COLORS.length]}1f` } : undefined}
                >
                  <span className="flex w-12 shrink-0 flex-col items-start">
                    <span className="h-3 w-3 rounded-full" style={{ background: DAY_COLORS[i % DAY_COLORS.length] }} aria-hidden />
                    <span className="tabi-title text-sm font-bold">Day {d.day}</span>
                    {start && <span className="tabi-muted text-[11px]">{thaiDate(isoDay(start, i))}</span>}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img(d.photo ?? d.city)} alt="" loading="lazy" onError={hideBroken} className="tabi-img h-[56px] w-[72px] shrink-0 rounded-[12px]" />
                  <span className="min-w-0 flex-1">
                    <span className="tabi-title block font-bold leading-snug">{d.title}</span>
                    <span className="tabi-muted block truncate text-xs">{sights.length ? sights.join(" · ") : d.items[0]?.text}</span>
                  </span>
                  <ChevronLeft size={18} className={`shrink-0 text-[var(--t-muted)] transition-transform ${open ? "-rotate-90" : "rotate-180"}`} aria-hidden />
                </button>
                {open && (
                  <ol className="tabi-timeline relative mb-3 ml-[52px] mt-2 space-y-3 border-l-2 border-dashed border-[var(--t-line)] pl-4">
                    {d.items.map((it, j) => {
                      const chip = CHIP[it.kind === "move" ? it.mode ?? "train" : it.kind];
                      return (
                        <li key={j} className="relative">
                          <span className="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-white" style={{ background: chip.fg }} />
                          <span className="absolute -left-[58px] top-0.5 w-8 text-right text-[11px] text-[var(--t-muted)]">{it.slot ? SLOT_TH[it.slot] : ""}</span>
                          <span className="mr-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: chip.bg, color: chip.fg }}>{chip.label}</span>
                          <span className={it.kind === "see" ? "font-semibold" : "text-sm"}>{it.text}</span>
                          {it.approx && <span className="ml-1 rounded bg-[var(--t-blue-soft)] px-1 text-[10px] text-[var(--t-blue)]">ประมาณ</span>}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </li>
            );
          })}
        </ol>
        <p className="tabi-muted px-1 text-[11px]">ภาพ: Wikipedia</p>
      </section>

      <section className="tabi-card p-4">
        <h2 className="mb-2 font-bold">เตรียมก่อนเดินทาง</h2>
        <ul className="space-y-1">
          {trip.checklist.map((c) => (
            <li key={c.id}>
              <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
                <input type="checkbox" checked={c.done} onChange={() => onToggle(c.id)} className="h-5 w-5 accent-[var(--t-blue)]" />
                <span className={c.done ? "tabi-pop line-through opacity-60" : ""}>{c.text}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-3 gap-2">
        <button type="button" className="tabi-btn tabi-btn--soft whitespace-nowrap px-2 text-sm" onClick={onMap}><MapIcon size={18} />แผนที่</button>
        <button type="button" className="tabi-btn tabi-btn--pink whitespace-nowrap px-2 text-sm" onClick={() => onAsk("ดูตั๋วเครื่องบินให้หน่อย")}><Plane size={18} />หาตั๋ว</button>
        <button type="button" className="tabi-btn tabi-btn--primary whitespace-nowrap px-2 text-sm" onClick={() => onAsk("อยากปรับแผนหน่อย")}><Pencil size={18} />ปรับแผน</button>
      </div>
    </div>
  );
}

// ── 5. Flights ──
function FlightCard({ link }: { link: NonNullable<TabiReply["flight"]> }) {
  return (
    <a href={link.url} target="_blank" rel="noopener noreferrer" className="tabi-card tabi-rise flex items-center gap-3 p-4">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--t-blue-soft)] text-[var(--t-blue)]"><Plane size={24} /></span>
      <span className="flex-1">
        <span className="block font-bold">{link.label}</span>
        <span className="tabi-muted block text-xs">{link.note}</span>
      </span>
      <ArrowRight size={20} className="text-[var(--t-blue)]" />
    </a>
  );
}

/** Boarding-pass style leg (video reference): coloured header, big airport codes, search button. */
function BoardingPass({ leg, href, index }: { leg: NonNullable<NonNullable<TabiReply["flight"]>["legs"]>[number]; href: string; index: number }) {
  const out = leg.dir === "outbound";
  const date = leg.date ? isoDay(leg.date) : null;
  return (
    <article className="tabi-card tabi-rise overflow-hidden" style={{ animationDelay: `${index * 90}ms` }}>
      <header className="flex items-center justify-between px-4 py-2 text-sm font-semibold" style={{ background: out ? "#e8f1ff" : "#dff5e8", color: out ? "#1a66d9" : "#17734b" }}>
        <span>{out ? "ขาไป" : "ขากลับ"}{date ? ` · ${thaiDate(date)} (${WEEKDAY_SHORT[date.getUTCDay()]})` : ""}</span>
        <Plane size={16} className={out ? "" : "rotate-180"} aria-hidden />
      </header>
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="text-left">
          <p className="tabi-title text-3xl font-bold leading-none">{leg.fromCode}</p>
          <p className="tabi-muted mt-1 text-xs">{leg.from}</p>
        </div>
        <div className="flex flex-1 items-center gap-1 text-[var(--t-muted)]" aria-hidden>
          <span className="h-px flex-1 border-t-2 border-dotted border-[var(--t-line)]" />
          <Plane size={18} />
          <span className="h-px flex-1 border-t-2 border-dotted border-[var(--t-line)]" />
        </div>
        <div className="text-right">
          <p className="tabi-title text-3xl font-bold leading-none">{leg.toCode}</p>
          <p className="tabi-muted mt-1 text-xs">{leg.to}</p>
        </div>
      </div>
      <a href={href} target="_blank" rel="noopener noreferrer" className="tabi-btn tabi-btn--soft mx-4 mb-4 flex">
        ดูเที่ยวบินใน Google Flights <ArrowRight size={18} />
      </a>
    </article>
  );
}

function FlightsScreen({ reply, trip, onBack, onChat, onPickDate }: {
  reply: TabiReply | null; trip: SavedTrip | null; onBack: () => void; onChat: () => void; onPickDate: () => void;
}) {
  const link = reply?.flight;
  return (
    <div className="tabi-rise space-y-4">
      <TopBar onBack={onBack} />
      {trip?.route && (
        <section className="tabi-card p-4">
          <p className="tabi-title font-bold">{trip.title}</p>
          <p className="tabi-muted text-sm">บินเข้า {trip.route.gateway.city} ({trip.route.gateway.airport})</p>
        </section>
      )}
      <section className="flex items-start gap-2">
        <Avatar size={44} animated />
        <p className="tabi-card flex-1 px-4 py-3">{reply?.bubbles.join(" ") ?? "เปิดหน้าค้นหาตั๋วที่ตรงกับทริปให้แล้วนะ"}</p>
      </section>
      {link?.legs?.length ? (
        <>
          {link.legs.map((leg, i) => (
            <BoardingPass key={leg.dir} leg={leg} index={i} href={leg.dir === "return" && link.returnUrl ? link.returnUrl : link.url} />
          ))}
          <p className="tabi-muted text-xs">{link.note}</p>
          {!link.legs[0].date && trip?.itinerary && (
            <button type="button" className="tabi-btn tabi-btn--pink w-full" onClick={onPickDate}>
              <CalendarDays size={18} />ตั้งวันเดินทาง เพื่อค้นตั๋วตามวันจริง
            </button>
          )}
        </>
      ) : (
        link && <FlightCard link={link} />
      )}
      <button type="button" className="tabi-btn tabi-btn--soft w-full" onClick={onChat}>คุยกับทาบิต่อ</button>
    </div>
  );
}

// ── Trips & placeholders ──
function TripsScreen({ trips, onOpen, onNew }: { trips: SavedTrip[]; onOpen: (t: SavedTrip) => void; onNew: () => void }) {
  return (
    <div className="tabi-rise space-y-4">
      <TopBar />
      <h1 className="text-2xl font-bold">ทริปของฉัน</h1>
      {trips.length === 0 ? (
        <section className="tabi-card space-y-3 p-5 text-center">
          <Avatar size={64} />
          <p>ยังไม่มีทริปที่เก็บไว้ เริ่มคุยกับทาบิแล้วเลือกเส้นทาง ทริปจะถูกเก็บไว้ในเครื่องนี้อัตโนมัติ</p>
          <button type="button" className="tabi-btn tabi-btn--primary w-full" onClick={onNew}>เริ่มวางแผนทริป</button>
        </section>
      ) : (
        <ul className="space-y-3">
          {trips.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => onOpen(t)} className="tabi-card flex w-full items-center gap-3 p-4 text-left">
                <span className="flex-1">
                  <span className="block font-bold">{t.title}</span>
                  <span className="tabi-muted block text-xs">{t.itinerary ? `ร่างทริป ${t.itinerary.length} วัน` : "เลือกเส้นทางแล้ว"} · แก้ไขล่าสุด {new Date(t.updatedAt).toLocaleDateString("th-TH")}</span>
                </span>
                <ArrowRight size={18} className="text-[var(--t-blue)]" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="tabi-muted text-xs">ทริปเก็บไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น ถ้าล้างข้อมูลเบราว์เซอร์ ทริปจะหายไป</p>
    </div>
  );
}

function SoonScreen() {
  return (
    <div className="tabi-rise space-y-4">
      <TopBar />
      <section className="tabi-card space-y-2 p-5 text-center">
        <Avatar size={64} />
        <p className="font-bold">โปรไฟล์ยังไม่เปิดใช้</p>
        <p className="tabi-muted text-sm">ตอนนี้ยังไม่ต้องสมัครสมาชิก ทริปทั้งหมดเก็บไว้ในเครื่องนี้</p>
      </section>
    </div>
  );
}
