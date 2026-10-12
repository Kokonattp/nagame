"use client";

// Tabi V1-lite: one conversation drives five screens (mockup 1–5).
// The server is stateless; this component owns trip context and sends it each turn.

import dynamic from "next/dynamic";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUp, CalendarDays, ChevronLeft, CircleHelp, Heart, Home, Map as MapIcon, Pencil, Plane, Plus, Send, User } from "lucide-react";
import type { HazardAlert } from "@/lib/tabi/alerts";
import { nearestGateway } from "@/lib/tabi/cities";
import { TABI_ART, type TabiMood } from "@/lib/tabi/mascot";
import { encodeShare, shareRef, tripTitle } from "@/lib/tabi/share";
import type { SharedTrip } from "@/lib/tabi/share-server";
import { listTrips, newTrip, saveTrip, type SavedTrip } from "@/lib/tabi/store";
import { deleteEverything, fetchMe, forgetAccountTrips, pullAndMerge, pushTrip, visibleTo, type Me } from "@/lib/tabi/sync";
import { track } from "@/lib/tabi/track";
import { signIn, signOut } from "next-auth/react";
import { FARES_CHECKED, legFare, yenRange, type LegFare } from "@/lib/tabi/fares";
import { FLIGHTS_CHECKED_AT, flightSnapFor, type FlightSnap } from "@/lib/tabi/flight-snapshot";
import { durationTh, travelTime } from "@/lib/tabi/rail-times";
import { STAY_AREA } from "@/lib/tabi/stay";
import { AIRPORTS, jrPassWorthIt, legLinks, type LegLink } from "@/lib/tabi/transport";
import type { DaySlot, Highlight, ItineraryDay, ItineraryItem, RouteOption, TabiReply, TripIntent } from "@/lib/tabi/types";
import type { MapPoint } from "./tabi-map";
import { renderShareImage } from "./share-image";
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

/** First-visit guide: each numbered tip appears once, on the screen where that step happens. */
const TOUR = [
  "พิมพ์บอกทาบิว่าอยากไปช่วงไหน กี่วัน ชอบเที่ยวแนวไหน หรือกดปุ่มลัดด้านล่างก็ได้",
  "เลือกเส้นทางที่ชอบ หรือพิมพ์ปรับ เช่น “ขอที่คนน้อยกว่านี้”",
  "กด “ใส่ในทริป” ที่จุดที่อยากแวะ แล้วกด “จัดแผนรายวัน”",
  "ตั้งวันออกเดินทาง แล้วกด “หาตั๋ว” ทาบิจะเปิดหน้าค้นเที่ยวบินตามวันนั้นให้",
];
const TOUR_KEY = "nagame-tabi-tour-v1";
type Tour = { ready: boolean; seen: number[]; dismiss: (step: number) => void; skip: () => void; replay: () => void };
const TourContext = createContext<Tour | null>(null);

/** Errors whose Thai message came from /api/tabi and is safe to show as-is. */
class ApiError extends Error {}

/** true at ≥ minWidth px; false during SSR/first paint (mobile-first). */
function useMinWidth(minWidth: number) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`);
    const update = () => setMatch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [minWidth]);
  return match;
}

const img = (wikiTitle: string) => `/api/tabi/image?title=${encodeURIComponent(wikiTitle)}`;
/** No Wikipedia image → hide the <img>; the .tabi-img gradient behind it stays as the fallback. */
const hideBroken = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.visibility = "hidden";
};

/** A trip opened from a share link starts on its day plan as an unsaved copy (saved on first keep/edit). */
function fromShared(shared: SharedTrip): SavedTrip {
  return { ...newTrip(shared.intent), title: shared.title, route: shared.route, itinerary: shared.itinerary, savedStops: shared.savedStops, status: "draft" };
}

export function TabiApp({ shared, initialAsk, source }: { shared?: SharedTrip; initialAsk?: string; source?: string } = {}) {
  const [screen, setScreen] = useState<Screen>(shared ? "itinerary" : "home");
  // Each screen root carries .tabi-rise, so a screen change already slides in.
  // (View Transitions were tried and dropped: with React state they left the old screen in place.)
  const go = setScreen;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routes, setRoutes] = useState<RouteOption[]>(() => (shared ? [shared.route] : []));
  const [selected, setSelected] = useState<RouteOption | null>(shared?.route ?? null);
  const [trip, setTrip] = useState<SavedTrip | null>(() => (shared ? fromShared(shared) : null));
  const [sharedState, setSharedState] = useState<"none" | "unsaved" | "saved">(shared ? "unsaved" : "none");
  const [cheerMsg, setCheerMsg] = useState<{ text: string; key: number } | null>(null);
  const cheer = useCallback((text: string) => setCheerMsg({ text, key: Date.now() }), []);
  const [lastReply, setLastReply] = useState<TabiReply | null>(null);
  const [trips, setTrips] = useState<SavedTrip[]>([]);

  // until we know who is signed in, show only trips made while signed out on this browser
  useEffect(() => { listTrips().then((all) => setTrips(all.filter(visibleTo(null)))); }, []);

  // optional sign-in: when the account sync is on, merge this browser's trips with the account's
  const [me, setMe] = useState<Me | null>(null);
  const syncOn = useRef(false);
  const account = useRef<string | null>(null);
  useEffect(() => {
    fetchMe().then(async (m) => {
      setMe(m);
      syncOn.current = m.sync;
      account.current = m.account;
      if (m.sync && m.account) setTrips(await pullAndMerge(m.account));
      else setTrips((await listTrips()).filter(visibleTo(m.account)));
    });
  }, []);

  // offline: saved trips keep working in Japan with a bad signal (public/sw.js); production only
  const [online, setOnline] = useState(true);
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  // guide progress lives in this browser only; storage can throw (private mode) → just show the guide
  const [tourSeen, setTourSeen] = useState<number[] | null>(null);
  useEffect(() => {
    try { setTourSeen(JSON.parse(localStorage.getItem(TOUR_KEY) ?? "[]")); } catch { setTourSeen([]); }
  }, []);
  const tour = useMemo<Tour>(() => {
    const store = (seen: number[]) => {
      setTourSeen(seen);
      try { localStorage.setItem(TOUR_KEY, JSON.stringify(seen)); } catch { /* not remembered; fine */ }
    };
    const seen = tourSeen ?? [];
    return {
      ready: tourSeen !== null,
      seen,
      dismiss: (step) => { if (step === TOUR.length) track("tour_done"); store([...new Set([...seen, step])]); },
      skip: () => { track("tour_skipped", { step: TOUR.length - seen.length }); store(TOUR.map((_, i) => i + 1)); },
      replay: () => { store([]); go("home"); window.scrollTo({ top: 0 }); },
    };
  }, [tourSeen, go]);

  const persist = useCallback(async (draft: SavedTrip) => {
    // tag with the signed-in account so a shared browser never mixes people's trips
    const next = account.current && !draft.owner ? { ...draft, owner: account.current } : draft;
    setTrip(next);
    setSharedState((s) => (s === "unsaved" ? "saved" : s));
    const stored = await saveTrip(next);
    // push the stored copy: it carries the new updatedAt that sync compares
    if (syncOn.current && stored) void pushTrip(stored);
    setTrips((await listTrips()).filter(visibleTo(account.current)));
  }, []);

  const send = useCallback(async (message: string, intentOverride?: TripIntent) => {
    const text = message.trim();
    if (!text || loading) return;
    track("ask", { first: turns.length === 0 });
    setError(null);
    setTurns((t) => [...t, { role: "user", text }]);
    go((s) => (s === "home" || s === "trips" ? "chat" : s));
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
            intent: intentOverride ?? lastReply?.intent ?? trip?.intent,
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
      if (reply.action === "answer") track("question_answered", { method: reply.links?.length ? "with_link" : "text" });

      if (reply.action === "suggest_routes" && reply.routes) {
        track("routes_shown", { refine: routes.length > 0, month: reply.intent.month ?? 0, days: reply.intent.durationDays ?? 0 });
        setRoutes(reply.routes);
        go("chat");
      } else if (reply.action === "open_route" && reply.openRouteId) {
        const r = routes.find((x) => x.id === reply.openRouteId);
        if (r) openRoute(r);
      } else if (reply.action === "suggest_stops") {
        go("route");
      } else if (reply.action === "draft_itinerary" && reply.itinerary) {
        // the server may re-fit nights to the requested days → keep its route
        const fitted = reply.selectedRoute ?? route;
        if (fitted) setSelected(fitted);
        const base = tripForRoute ?? newTrip(reply.intent);
        await persist({ ...base, intent: reply.intent, route: fitted, itinerary: reply.itinerary, status: "draft", title: tripTitle(fitted, reply.itinerary.length) });
        track("itinerary_drafted", { days: reply.itinerary.length, stops: fitted?.stops.length ?? 0 });
        cheer("จัดแผนรายวันเสร็จแล้ว!");
        go("itinerary");
      } else if (reply.action === "flights") {
        track("flights_opened");
        go("flights");
      } else {
        go("chat");
      }
    } catch (e) {
      const timedOut = e instanceof DOMException && e.name === "TimeoutError";
      setError(e instanceof ApiError ? e.message : timedOut ? "ทาบิตอบช้ากว่าปกติ ลองส่งใหม่อีกครั้งนะ" : !navigator.onLine ? "ตอนนี้ออฟไลน์อยู่ ทริปที่เก็บไว้ยังเปิดดูได้ แต่คุยกับทาบิต้องต่อเน็ตก่อนนะ" : "เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองส่งใหม่อีกครั้งนะ");
    } finally {
      setLoading(false);
    }
    // openRoute only calls state setters (selected + go), so it is safe to leave out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, lastReply, trip, routes, selected, persist, go, turns.length]);

  // first view: count the visit; a /?q= link (month pages) asks Tabi straight away, once
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (shared) track("shared_trip_opened", { ref: shared.ref, days: shared.itinerary.length });
    else track("home_view", { source: source ?? (initialAsk ? "month_page" : "direct") });
    if (initialAsk || source) window.history.replaceState(null, "", "/");
    if (initialAsk) {
      void send(initialAsk);
    }
  }, [shared, initialAsk, source, send]);

  /** Viewing a route never creates a trip; a trip is saved only when the user keeps something. */
  function openRoute(r: RouteOption) {
    track("route_opened", { route: r.id, stops: r.stops.length });
    setSelected(r);
    go("route");
  }

  function addStop(h: Highlight) {
    if (!selected) return;
    const base = trip && trip.route?.id === selected.id ? trip : newTrip(lastReply?.intent ?? trip?.intent ?? { preferences: [], focus: [] });
    if (base.savedStops.some((s) => s.id === h.id)) return;
    track("stop_added");
    cheer("ใส่ในทริปแล้ว");
    void persist({ ...base, route: selected, title: tripTitle(selected), savedStops: [...base.savedStops, h] });
  }

  /** A cheap date range picked on the flights screen becomes the trip's dates, then dated tickets. */
  function pickDates(depart: string, days: number) {
    // the newest conversation wins; the open trip is only updated when it is the trip being discussed
    const base = lastReply?.intent ?? trip?.intent ?? { preferences: [], focus: [] };
    const sameTrip = trip && (!lastReply || !lastReply.intent.month || lastReply.intent.month === trip.intent.month || !trip.intent.month);
    // keep the length the traveller asked for; the calendar length is only the nearest sample
    const intent: TripIntent = { ...base, startDate: depart, month: Number(depart.slice(5, 7)), durationDays: (sameTrip ? trip?.itinerary?.length : undefined) ?? base.durationDays ?? days };
    if (trip && sameTrip) void persist({ ...trip, intent, status: trip.itinerary ? "planned" : trip.status });
    track("date_set", { month: intent.month ?? 0, source: "cheap_dates" });
    void send("ดูตั๋วเครื่องบินให้หน่อย", intent);
  }

  function openTrip(t: SavedTrip) {
    setTrip(t);
    setSelected(t.route ?? null);
    setRoutes(t.route ? [t.route] : []);
    setLastReply(null);
    go(t.itinerary ? "itinerary" : t.route ? "route" : "chat");
  }

  const nav = (s: Screen) => () => go(s);

  return (
    <TourContext.Provider value={tour}>
    <div className="tabi">
      <div className="tabi-shell">
        {!online && <p role="status" className="mb-3 rounded-2xl bg-[#fff4d6] px-4 py-2 text-sm text-[#7a5a00]">📴 ออฟไลน์อยู่ ทริปที่เก็บไว้ยังเปิดดูได้</p>}
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
            sharedState={sharedState}
            onKeep={() => { track("shared_trip_saved", { ref: shared?.ref ?? "" }); void persist(trip); cheer("เก็บไว้ในทริปของฉันแล้ว"); }}
            onShare={async () => {
              const r = await shareTrip(trip);
              if (r !== "failed") cheer(r === "shared" ? "ส่งให้เพื่อนแล้ว!" : "คัดลอกลิงก์แล้ว!");
              return r;
            }}
            onEdit={(itinerary, method) => { track("plan_edited", { method }); void persist({ ...trip, itinerary }); }}
            onSetDate={(iso) => {
              track("date_set", { month: Number(iso.slice(5, 7)) });
              // the date fixes month and length too, so the next turn (e.g. "หาตั๋ว") searches these exact days
              const intent = { ...trip.intent, startDate: iso, month: Number(iso.slice(5, 7)), durationDays: trip.itinerary?.length ?? trip.intent.durationDays };
              void persist({ ...trip, intent, status: "planned" });
              setLastReply((r) => (r ? { ...r, intent } : r));
            }}
          />
        )}
        {screen === "flights" && <FlightsScreen reply={lastReply} trip={trip} onPickDates={pickDates} onBack={nav(trip?.itinerary ? "itinerary" : "chat")} onChat={nav("chat")} onPickDate={nav("itinerary")} />}
        {screen === "trips" && <TripsScreen trips={trips} onOpen={openTrip} onNew={nav("home")} />}
        {screen === "soon" && (
          <ProfileScreen
            me={me}
            tripCount={trips.length}
            onSignOut={async () => { if (account.current) await forgetAccountTrips(account.current); await signOut().catch(() => {}); }}
            onDeleteAll={async () => {
              const r = await deleteEverything(account.current, Boolean(me?.sync));
              setTrips((await listTrips()).filter(visibleTo(account.current)));
              setTrip(null);
              return r;
            }}
          />
        )}
      </div>

      {cheerMsg && <TabiCheer key={cheerMsg.key} text={cheerMsg.text} onDone={() => setCheerMsg(null)} />}
      <nav className="tabi-nav" aria-label="เมนูหลัก">
        <div className="tabi-nav-inner">
          <button type="button" className="tabi-nav-brand" onClick={nav("home")} aria-label="Nagame หน้าแรก">
            <FujiMark />
            <span className="tabi-title text-[22px] font-bold leading-none tracking-tight text-[var(--t-navy)]">Nagame</span>
          </button>
          <NavButton icon={<Home size={22} />} label="หน้าแรก" active={screen === "home"} onClick={nav("home")} />
          <NavButton icon={<MapIcon size={22} />} label="วางแผนทริป" active={["chat", "route", "itinerary", "flights"].includes(screen)} onClick={nav(turns.length ? "chat" : "home")} />
          <NavButton icon={<Heart size={22} />} label="ทริปของฉัน" active={screen === "trips"} onClick={nav("trips")} />
          <NavButton icon={<User size={22} />} label="โปรไฟล์" active={screen === "soon"} onClick={nav("soon")} />
          <button type="button" className="tabi-nav-help" onClick={tour.replay}><CircleHelp size={22} />วิธีใช้</button>
        </div>
      </nav>
    </div>
    </TourContext.Provider>
  );
}

type ShareResult = "shared" | "copied" | "failed";

/**
 * Phone: the system share sheet with the trip image + link (LINE, Messenger…).
 * Desktop without a share sheet: copy the link and download the image.
 */
async function shareTrip(trip: SavedTrip): Promise<ShareResult> {
  const code = encodeShare(trip);
  if (!code) return "failed";
  const url = `${location.origin}/t/${code}`;
  const text = `ทริป ${trip.route?.stops.map((s) => s.cityTh).join(" → ")} ${trip.itinerary?.length ?? ""} วัน — ทาบิจัดให้`;
  const file = await renderShareImage(trip).catch(() => null);
  try {
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: trip.title, text: `${text}\n${url}` });
      track("trip_shared", { method: "image", ref: shareRef(code) });
      return "shared";
    }
    if (navigator.share) {
      await navigator.share({ title: trip.title, text, url });
      track("trip_shared", { method: "link", ref: shareRef(code) });
      return "shared";
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "failed"; // closed the sheet
  }
  try {
    await navigator.clipboard.writeText(url);
    if (file) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(file);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }
    track("trip_shared", { method: "copy", ref: shareRef(code) });
    return "copied";
  } catch {
    return "failed";
  }
}

// ── shared bits ──
/** Happy Tabi waving from the bottom for ~2 s after something worked (plan drafted, shared, saved). */
function TabiCheer({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="tabi-cheer" role="status" aria-live="polite">
      <Avatar mood="happy" size={40} />
      <span className="font-semibold">{text}</span>
    </div>
  );
}

/** Seasonal particles over the home hero (sakura Mar–Apr, leaves Oct–Nov, snow Dec–Feb). Decorative. */
function SeasonFx() {
  const [month, setMonth] = useState<number | null>(null);
  useEffect(() => setMonth(new Date().getMonth() + 1), []);
  const kind = month === null ? null : month >= 3 && month <= 4 ? "petal" : month >= 10 && month <= 11 ? "leaf" : month === 12 || month <= 2 ? "snow" : null;
  if (!kind) return null;
  return (
    <div className="tabi-season" aria-hidden>
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} className={`tabi-fall tabi-fall--${kind}`} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.9) % 7}s`, animationDuration: `${7 + (i % 5)}s` }}>
          {kind === "leaf" ? "🍁" : null}
        </span>
      ))}
    </div>
  );
}
/** Plays the 12-frame three.js loop (breathe, sway, tail wag, blink) unless `animated={false}`. */
function Avatar({ mood = "idle", size = 44, wag = false, animated = true }: { mood?: TabiMood; size?: number; wag?: boolean; animated?: boolean }) {
  const art = TABI_ART[mood];
  const sprite = animated && "sprite" in art ? art.sprite : null;
  return (
    <span className="tabi-avatar relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white bg-[var(--t-sakura)] shadow-[var(--t-shadow-sm)]" style={{ width: size, height: size }}>
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

/** Numbered guide bubble, placed in the flow next to the control it explains (never covers it). */
function TourTip({ step, pointer = "down" }: { step: number; pointer?: "up" | "down" }) {
  const tour = useContext(TourContext);
  if (!tour?.ready || tour.seen.includes(step)) return null;
  return (
    <div role="note" aria-label={`วิธีใช้ ขั้นที่ ${step} จาก ${TOUR.length}`} className={`tabi-tip tabi-pop tabi-tip--${pointer}`}>
      <span className="tabi-tip-num" aria-hidden>{step}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{TOUR[step - 1]}</p>
        <div className="mt-2 flex items-center gap-2">
          <button type="button" className="tabi-tip-ok" onClick={() => tour.dismiss(step)}>{step < TOUR.length ? "เข้าใจแล้ว" : "เริ่มใช้เลย"}</button>
          {step < TOUR.length && <button type="button" className="tabi-tip-skip" onClick={tour.skip}>ข้ามวิธีใช้</button>}
          <span className="ml-auto text-xs opacity-80">{step}/{TOUR.length}</span>
        </div>
      </div>
    </div>
  );
}

function HelpButton() {
  const tour = useContext(TourContext);
  return (
    <button type="button" onClick={tour?.replay} aria-label="วิธีใช้งาน" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[var(--t-blue)] shadow-[var(--t-shadow-sm)] lg:hidden">
      <CircleHelp size={22} />
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
    <header className={`mb-4 flex items-center gap-3 ${!onBack && !right ? "lg:hidden" : ""}`}>
      {onBack && (
        <button type="button" onClick={onBack} aria-label="ย้อนกลับ" className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-[var(--t-shadow-sm)]">
          <ChevronLeft size={22} />
        </button>
      )}
      {/* min-w-0: with a button on the right (route screen) the brand shrinks instead of pushing the page wider */}
      <div className="flex min-w-0 flex-1 items-center gap-2 lg:invisible">
        <FujiMark />
        <div className={right ? "hidden min-w-0 min-[400px]:block" : "min-w-0"}>
          <p className="tabi-title text-[22px] font-bold leading-none tracking-tight">Nagame</p>
          <p className={`tabi-muted text-xs ${right ? "hidden sm:block" : ""}`}>วางทริปญี่ปุ่นกับทาบิ</p>
        </div>
      </div>
      {right}
      <HelpButton />
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
      <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-10 lg:space-y-0">
      {/* Hero (mockup 1): Fuji + Chūreitō pagoda; a light wash keeps the heading readable */}
      <section className="relative -mx-4 overflow-hidden sm:mx-0 sm:rounded-[28px] lg:sticky lg:top-[92px]">
        <SeasonFx />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img("Arakurayama Sengen Park")} alt="" onError={hideBroken} className="tabi-img h-[300px] w-full object-[50%_70%] lg:h-[560px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(247,251,255,.97)] via-[rgba(247,251,255,.7)] to-transparent" />
        <div className="absolute inset-x-0 top-0 px-4 pt-3 sm:px-5 lg:px-8 lg:pt-8">
          <h1 className="text-[34px] font-bold leading-[1.15] tracking-tight lg:text-[52px]">เริ่มวางแผน<br />ทริปญี่ปุ่น 🌸</h1>
          <p className="mt-2 max-w-[260px] font-medium text-[var(--t-navy)] lg:max-w-[380px] lg:text-lg">บอกทาบิว่าอยากไปช่วงไหน กี่วัน และชอบเที่ยวแนวไหน</p>
        </div>
        <p className="absolute bottom-2 right-3 rounded-full bg-black/40 px-2 text-[10px] text-white">ภาพ: Wikipedia</p>
      </section>
      <div className="space-y-6">
      <div className="tabi-ask-row flex items-center gap-3">
        <Avatar size={52} />
        <div className="flex-1"><Composer onAsk={onAsk} loading={false} placeholder="เช่น 5 วัน พ.ค. เน้นธรรมชาติ" /></div>
      </div>
      <TourTip step={1} pointer="up" />
      <div className="grid grid-cols-3 gap-2">
        {INSPIRATION.map((c) => (
          <button key={c.label} type="button" className="tabi-chip justify-center" onClick={() => onAsk(c.prompt)}>
            <span aria-hidden className="tabi-emoji">{c.emoji}</span>{c.label}
          </button>
        ))}
      </div>
      <section>
        <h2 className="tabi-petal mb-3 text-lg font-bold">แรงบันดาลใจจากญี่ปุ่น</h2>
        <div className="tabi-scroll-x tabi-ideas -mx-4 px-4 lg:mx-0 lg:px-0">
          {IDEAS.map((idea) => (
            <button key={idea.title} type="button" onClick={() => onAsk(idea.prompt)} className="tabi-card w-[180px] shrink-0 overflow-hidden text-left lg:w-auto">
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
      <Link href="/japan" className="tabi-card flex items-center gap-3 p-4">
        <span className="text-2xl" aria-hidden>🗓️</span>
        <span className="flex-1"><b className="tabi-title block">ไปญี่ปุ่นเดือนไหนดี?</b><span className="tabi-muted text-sm">ดูที่เที่ยวเด่นและที่ปิดในแต่ละเดือน</span></span>
        <ArrowRight size={18} className="text-[var(--t-blue)]" />
      </Link>
      </div>
      </div>
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
  const lastTabi = turns.findLastIndex((t) => t.role === "tabi");
  const points: MapPoint[] = useMemo(() => (routes[0] ? routes[0].stops.map((s) => ({ lat: s.lat, lon: s.lon, label: s.city, kind: "stop" as const })) : []), [routes]);
  const desktop = useMinWidth(1024);
  const showRoutes = last?.action === "suggest_routes" && routes.length > 0;
  // one map instance: inline under the cards on phones, pinned in the side column on desktop
  const mapCard = showRoutes && (
    <div className="tabi-card p-3">
      <p className="mb-2 text-sm font-semibold">แผนที่ของเส้นทางที่ 1</p>
      <TabiMap points={points} height={desktop ? 380 : 170} interactive={false} />
      <button type="button" className="tabi-btn tabi-btn--soft mt-2 w-full" onClick={() => onPick(routes[0])}>
        <MapIcon size={18} />ดูเส้นทางนี้แบบเต็ม
      </button>
    </div>
  );

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-8">
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
              {/* only the newest reply moves: a column of moving cats is noisy and costly on phones */}
              <Avatar size={38} mood={t.reply?.action === "ask" ? "worried" : "idle"} animated={i === lastTabi && !loading} />
              <div className="max-w-[82%] space-y-1">
                <p className="text-xs font-semibold text-[var(--t-pink-ink)]">ทาบิ</p>
                {t.text.split("\n").map((b, j) => (
                  <p key={j} className="tabi-card rounded-tl-md px-4 py-2.5">{b}</p>
                ))}
                {t.reply?.links?.length ? (
                  <span className="flex flex-wrap gap-1 pt-1">
                    {t.reply.links.map((l) => (
                      <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="tabi-leg-link">{l.label} ↗</a>
                    ))}
                  </span>
                ) : null}
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

      {showRoutes && (
        <section className="space-y-3" aria-label="เส้นทางที่ทาบิแนะนำ">
          <TourTip step={2} />
          {routes.map((r, i) => <RouteCard key={r.id} route={r} index={i} onPick={() => onPick(r)} />)}
          <p className="tabi-muted text-[11px]">ภาพ: Wikipedia · เวลาเดินทางเป็นค่าประมาณ</p>
          {!desktop && mapCard}
        </section>
      )}
      {last?.ask && <Chips items={last.ask.chips} onPick={onAsk} />}
      {last?.flight && <FlightCard link={last.flight} />}
      {!last?.ask && last?.chips && <Chips items={last.chips} onPick={onAsk} />}
      <div ref={end} className="h-16" aria-hidden />
      <div className="sticky bottom-[84px] pt-2 lg:bottom-6"><Composer onAsk={onAsk} loading={loading} /></div>
    </div>
    {desktop && <aside className="tabi-sticky hidden lg:block">{mapCard || <ChatSideTip />}</aside>}
    </div>
  );
}

/** Desktop side column before any route exists: what Tabi can do. */
function ChatSideTip() {
  return (
    <section className="tabi-card space-y-2 bg-[var(--t-sakura)] p-5">
      <Avatar size={64} mood="happy" animated />
      <p className="font-bold text-[var(--t-pink-ink)]">ลองบอกทาบิแบบนี้</p>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        <li>ไป 10 ธ.ค. 5 วัน อยากเห็นหิมะ</li>
        <li>พาลูกไปญี่ปุ่นครั้งแรก เมษา 6 วัน</li>
        <li>อยากไปเกียวโต ดูใบไม้เปลี่ยนสี</li>
      </ul>
    </section>
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
  const desktop = useMinWidth(1024);
  return (
    <div className="tabi-rise space-y-4">
      <TopBar
        onBack={onBack}
        right={
          <button type="button" className="tabi-btn tabi-btn--soft whitespace-nowrap px-3 text-sm" disabled={loading} onClick={() => onAsk("เสนอเส้นทางแบบอื่น")}>
            <Pencil size={16} />ปรับเส้นทาง
          </button>
        }
      />
      <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-8 lg:space-y-0">
      <div className="tabi-sticky space-y-4">
      <section>
        <h1 className="text-2xl font-bold lg:text-3xl">เส้นทางที่แนะนำ</h1>
        <p className="tabi-muted">{route.stops.map((s) => `${s.cityTh} ${s.nights} คืน`).join(" → ")}</p>
      </section>
      {/* city strip with a photo per stop (mockup 3) */}
      {route.stops.length > 1 && <ol className="tabi-card tabi-scroll-x items-start p-3" aria-label="ลำดับเมือง">
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
      </ol>}
      <div className="tabi-card p-2"><TabiMap points={points} height={desktop ? 420 : 240} /></div>
      <section className="tabi-card flex gap-3 bg-[var(--t-sakura)] p-4">
        <Avatar size={48} mood="happy" animated />
        <div>
          <p className="font-bold text-[var(--t-pink-ink)]">มุมมองจากทาบิ</p>
          <p className="text-sm">{route.reason}{route.tradeoff ? ` · ข้อแลก: ${route.tradeoff}` : ""}</p>
        </div>
      </section>
      </div>
      <div className="space-y-4">
      <section className="space-y-3">
        <h2 className="tabi-petal text-lg font-bold">{reply?.action === "suggest_stops" ? "จุดแวะที่ทาบิหาเพิ่มให้" : "จุดเด่นระหว่างทาง"}</h2>
        <TourTip step={3} />
        {stops.map((h) => {
          const saved = savedIds.has(h.id);
          return (
            <article key={h.id} className="tabi-card tabi-rise flex gap-3 overflow-hidden p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img(h.wikiTitle)} alt="" loading="lazy" onError={hideBroken} className="tabi-img h-[88px] w-[96px] shrink-0 rounded-[14px]" />
              <div className="min-w-0 flex-1 py-1">
                <p className="tabi-title font-bold leading-snug">{h.name}</p>
                {(h.nameEn || h.nameJa) && <p className="tabi-muted text-xs">{[h.nameEn, h.nameJa].filter(Boolean).join(" · ")}</p>}
                <p className="tabi-muted text-xs">{h.approxDetourMin ? `จาก ${h.city} ประมาณ ${h.approxDetourMin} นาที` : `อยู่ใน ${h.city}`}{h.reason ? ` · ${h.reason}` : ""}</p>
                <button type="button" onClick={() => onAdd(h)} disabled={saved} className="tabi-btn tabi-btn--soft mt-2 min-h-[36px] px-3 text-sm" aria-label={saved ? `${h.name} อยู่ในทริปแล้ว` : `ใส่ ${h.name} ในทริป`}>
                  {saved ? <span className="tabi-stamp">✓ ในทริป</span> : <><Plus size={16} />ใส่ในทริป</>}
                </button>
              </div>
            </article>
          );
        })}
        <p className="tabi-muted text-[11px]">ข้อมูล: Wikidata, Wikivoyage · ภาพ: Wikipedia</p>
      </section>
      <button type="button" className="tabi-btn tabi-btn--primary w-full" disabled={loading} onClick={() => onAsk("จัดเป็นแผนรายวันให้หน่อย")}><CalendarDays size={18} />จัดแผนรายวัน</button>
      <Chips items={["ขอแวะออนเซ็นระหว่างทาง", "ขอแวะที่คนน้อย", "ขอแวะที่วิวสวยถ่ายรูป"]} onPick={onAsk} />
      </div>
      </div>
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
  bus: { label: "🚌 รถบัส", bg: "#fff6d6", fg: "#7a5a00" },
  ferry: { label: "⛴️ เรือ", bg: "#e3f6fb", fg: "#0d6a80" },
  airport: { label: "🧳 ไปสนามบิน", bg: "#fff1e6", fg: "#a5521a" },
  see: { label: "📍 เที่ยว", bg: "#ffe9f2", fg: "#c2185b" },
  eat: { label: "🍜 มื้อเย็น", bg: "#fff4d6", fg: "#7a5a00" },
  stay: { label: "🛏️ ที่พัก", bg: "#eef1f7", fg: "#4b5878" },
} as const;

const isoDay = (iso: string, plus = 0) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + plus);
  return d;
};
const thaiDate = (d: Date) => `${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth() + 1]}`;
const todayIso = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

function ItineraryScreen({ trip, sharedState, onKeep, onShare, onEdit, onBack, onAsk, onMap, onToggle, onSetDate }: {
  sharedState: "none" | "unsaved" | "saved"; onKeep: () => void; onShare: () => Promise<ShareResult>;
  onEdit: (days: ItineraryDay[], method: "swap" | "remove" | "add") => void;
  trip: SavedTrip; onBack: () => void; onAsk: (m: string) => void; onMap: () => void; onToggle: (id: string) => void;
  onSetDate: (iso: string) => void;
}) {
  const days = trip.itinerary ?? [];
  const [active, setActive] = useState(0);
  // traveller edits: swap / remove / add a sight (the next best place comes from the place store)
  const [busy, setBusy] = useState<string | null>(null);
  const [editNote, setEditNote] = useState<string | null>(null);
  const nextPlace = async (city: string): Promise<Highlight | null> => {
    const used = days.flatMap((d) => d.items.map((it) => it.placeId)).filter((x): x is string => !!x);
    const q = new URLSearchParams({ city, month: String(trip.intent.month ?? ""), prefs: trip.intent.preferences.join(","), exclude: used.join(",") });
    try {
      const res = await fetch(`/api/tabi/alternative?${q}`);
      return res.ok ? ((await res.json()) as { place: Highlight | null }).place : null;
    } catch {
      return null;
    }
  };
  const editDay = (i: number, items: ItineraryItem[], method: "swap" | "remove" | "add") => {
    // re-slot sights after an edit: morning first unless the day starts with a move
    const morningMove = items.some((it) => it.kind === "move" && it.slot === "morning");
    let n = 0;
    const slotted = items.map((it) => (it.kind === "see" ? { ...it, slot: (n++ === 0 && !morningMove ? "morning" : "afternoon") as DaySlot } : it));
    onEdit(days.map((d, k) => (k === i ? { ...d, items: slotted, photo: slotted.find((it) => it.kind === "see" && it.wikiTitle)?.wikiTitle ?? d.photo } : d)), method);
  };
  async function swapSight(i: number, j: number) {
    setBusy(`${i}-${j}`);
    setEditNote(null);
    const alt = await nextPlace(days[i].city);
    if (alt) editDay(i, days[i].items.map((it, k) => (k === j ? { ...it, text: alt.name, placeId: alt.id, wikiTitle: alt.wikiTitle } : it)), "swap");
    else setEditNote(`แถว${days[i].city}ทาบิไม่มีที่อื่นให้เปลี่ยนแล้ว`);
    setBusy(null);
  }
  async function addSight(i: number) {
    setBusy(`${i}-add`);
    setEditNote(null);
    const alt = await nextPlace(days[i].city);
    if (alt) {
      const items = [...days[i].items];
      const at = items.findIndex((it) => it.kind === "eat" || it.kind === "stay");
      items.splice(at < 0 ? items.length : at, 0, { kind: "see", slot: "afternoon", text: alt.name, placeId: alt.id, wikiTitle: alt.wikiTitle });
      editDay(i, items, "add");
    } else setEditNote(`แถว${days[i].city}ทาบิไม่มีที่อื่นให้เพิ่มแล้ว`);
    setBusy(null);
  }
  const month = trip.intent.month;
  const start = trip.intent.startDate;
  const countdown = start ? Math.round((isoDay(start).getTime() - isoDay(todayIso()).getTime()) / 86_400_000) : null;
  // live hazard warnings matter only when the trip is close: from a week before until the last day
  const nearTrip = countdown !== null && countdown <= 7 && countdown > -days.length;
  const alertCities = trip.route?.stops.map((s) => s.city).join(",") ?? "";
  const [alerts, setAlerts] = useState<HazardAlert[]>([]);
  useEffect(() => {
    if (!nearTrip || !alertCities) return;
    let live = true;
    fetch(`/api/tabi/alerts?cities=${encodeURIComponent(alertCities)}`)
      .then((r) => (r.ok ? r.json() : { alerts: [] }))
      .then((d: { alerts?: HazardAlert[] }) => { if (live) setAlerts(d.alerts ?? []); })
      .catch(() => { /* no alert shown is the safe failure: JMA stays one tap away for the traveller */ });
    return () => { live = false; };
  }, [nearTrip, alertCities]);
  return (
    <div className="tabi-rise space-y-4">
      <TopBar onBack={onBack} />
      <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8 lg:space-y-0">
      <div className="space-y-4">
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
      {nearTrip && alerts.length > 0 && <HazardCard alerts={alerts} />}
      {sharedState !== "none" && (
        <section className="tabi-card tabi-pop flex flex-wrap items-center gap-3 bg-[var(--t-sakura)] p-4">
          <span className="text-2xl" aria-hidden>💌</span>
          <p className="min-w-0 flex-1 text-sm"><b className="text-[var(--t-pink-ink)]">เพื่อนแชร์ทริปนี้มา</b> ปรับต่อได้ตามใจ ทริปของเพื่อนไม่เปลี่ยน</p>
          {sharedState === "unsaved"
            ? <button type="button" className="tabi-btn tabi-btn--primary px-4 text-sm" onClick={onKeep}><Heart size={16} />เก็บไว้ในทริปของฉัน</button>
            : <span className="tabi-stamp text-sm">✓ เก็บแล้ว</span>}
        </section>
      )}
      <TourTip step={4} pointer="up" />
      <section className="tabi-card flex gap-3 lg:hidden bg-[var(--t-sakura)] p-4">
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
                          <LegLinks links={legLinks(it.from, it.to)} />
                          {it.kind === "eat" && it.mapQuery && (
                            <span className="mt-1 flex"><a className="tabi-leg-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`restaurants near ${it.mapQuery}`)}`} target="_blank" rel="noopener noreferrer">🔎 หาร้านแถวนี้ ↗</a></span>
                          )}
                          {it.kind === "see" && (
                            <span className="mt-1 flex gap-1">
                              {it.placeId && (
                                <button type="button" className="tabi-edit" disabled={busy !== null} onClick={() => swapSight(i, j)} aria-label={`เปลี่ยน ${it.text} เป็นที่อื่น`}>
                                  {busy === `${i}-${j}` ? "กำลังหา…" : "🔄 เปลี่ยน"}
                                </button>
                              )}
                              <button type="button" className="tabi-edit" disabled={busy !== null} onClick={() => editDay(i, d.items.filter((_, k) => k !== j), "remove")} aria-label={`ลบ ${it.text} ออกจากวันนี้`}>✕ ลบ</button>
                            </span>
                          )}
                        </li>
                      );
                    })}
                    {d.items.some((it) => it.kind === "stay") && d.items.filter((it) => it.kind === "see").length < 4 && (
                      <li>
                        <button type="button" className="tabi-edit" disabled={busy !== null} onClick={() => addSight(i)}>
                          {busy === `${i}-add` ? "กำลังหา…" : "＋ เพิ่มที่เที่ยววันนี้"}
                        </button>
                      </li>
                    )}
                    {editNote && <li className="tabi-muted text-xs" role="status">{editNote}</li>}
                  </ol>
                )}
              </li>
            );
          })}
        </ol>
        <p className="tabi-muted px-1 text-[11px]">ข้อมูล: Wikidata, Wikivoyage · ภาพ: Wikipedia</p>
      </section>

      </div>
      <div className="tabi-sticky space-y-4">
      <section className="tabi-card hidden gap-3 lg:flex bg-[var(--t-sakura)] p-4">
        <Avatar size={44} mood="happy" />
        <p className="text-sm"><b className="text-[var(--t-pink-ink)]">นี่คือร่างทริปคร่าว ๆ</b> เวลาเดินทางเป็นค่าประมาณ บอกทาบิให้ปรับได้ตลอดนะ</p>
      </section>
      {trip.route && <TransportCard route={trip.route} />}
      <section className="tabi-card p-4">
        <h2 className="tabi-petal mb-2 font-bold">เตรียมก่อนเดินทาง</h2>
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
      <ShareButton onShare={onShare} />
      </div>
      </div>
    </div>
  );
}

/** "ดูทาง" → Google Maps transit (live trains). Tokyo has two airports, so one pill per airport. */
function LegLinks({ links }: { links: LegLink[] }) {
  if (!links.length) return null;
  return (
    <span className="mt-1 flex flex-wrap items-center gap-1">
      {links.map((l) => (
        <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="tabi-leg-link" onClick={() => track("leg_map_clicked")}>
          🗺️ ดูทาง{l.label ? ` ${l.label}` : ""} ↗
        </a>
      ))}
    </span>
  );
}

const HOP_ICON = { train: "🚆", bus: "🚌", ferry: "⛴️", flight: "✈️" } as const;
/** "🚆 เข้าเมือง ~3 ชม. 15 นาที" from rail-times; the label alone when the hop is unknown. */
function hopLabel(from: string, to: string, what: string) {
  const t = travelTime(from, to);
  return t ? `${HOP_ICON[t.mode]} ${what} ~${durationTh(t.minutes)}` : `🚆 ${what}`;
}

/** Subway-map style overview: airport → cities → airport, each hop opens live trains, plus one JR Pass verdict. */
function TransportCard({ route }: { route: RouteOption }) {
  const first = route.stops[0];
  const last = route.stops[route.stops.length - 1];
  const out = nearestGateway(last).g.airport;
  const airportNames = (code: string) => (AIRPORTS[code] ?? []).map((a) => a.th).join(" / ");
  // train fares between cities: only legs with a checked fare count; the rest point to Google Maps
  const legFares = route.stops.slice(1).map((s, i) => legFare(route.stops[i].city, s.city));
  const known = legFares.filter((f): f is LegFare => !!f);
  const unknown = legFares.length - known.length;
  const hops = [
    { label: hopLabel(`airport:${route.gateway.airport}`, first.city, "เข้าเมือง"), links: legLinks(`airport:${route.gateway.airport}`, first.city) },
    ...route.stops.slice(1).map((s, i) => {
      const fare = legFares[i];
      return { label: `${hopLabel(route.stops[i].city, s.city, "ไปเมืองถัดไป")}${fare ? ` · ${yenRange(fare)}` : ""}`, links: legLinks(route.stops[i].city, s.city) };
    }),
    { label: hopLabel(last.city, `airport:${out}`, "ไปสนามบิน"), links: legLinks(last.city, `airport:${out}`) },
  ];
  const nodes = [
    { key: "in", icon: "🛬", title: `สนามบิน${airportNames(route.gateway.airport)}` },
    ...route.stops.map((s) => ({ key: s.city, icon: "", title: `${s.cityTh} · ${s.nights} คืน`, stay: STAY_AREA[s.city] })),
    { key: "out", icon: "🛫", title: `บินกลับจาก${airportNames(out)}` },
  ];
  return (
    <section className="tabi-card p-4" aria-label="การเดินทางในญี่ปุ่น">
      <h2 className="mb-3 flex items-center gap-2 font-bold"><span className="tabi-train" aria-hidden>🚃</span>เดินทางในญี่ปุ่น</h2>
      <ol className="tabi-track">
        {nodes.map((n, i) => (
          <li key={n.key}>
            <span className="tabi-track-node" style={n.icon ? undefined : { background: DAY_COLORS[(i - 1) % DAY_COLORS.length] }} aria-hidden>{n.icon}</span>
            <span className="tabi-title text-sm font-bold">{n.title}</span>
            {"stay" in n && n.stay && <span className="tabi-muted text-xs">🛏️ พักที่ไหนดี: {n.stay}</span>}
            {i < hops.length && (
              <span className="tabi-track-hop">
                <span className="tabi-muted text-xs">{hops[i].label}</span>
                <LegLinks links={hops[i].links} />
              </span>
            )}
          </li>
        ))}
      </ol>
      {legFares.length > 0 && (
        <div className="mt-3 rounded-2xl bg-[var(--t-blue-soft)] px-3 py-2 text-sm">
          <p>
            💴 ค่ารถไฟระหว่างเมือง{" "}
            {known.length
              ? <b>~{yenRange({ min: known.reduce((a, f) => a + f.min, 0), max: known.reduce((a, f) => a + f.max, 0) })}</b>
              : "ดูราคาในปุ่มดูทาง (Google Maps บอกค่ารถ)"}
            {known.length > 0 && unknown > 0 ? ` + อีก ${unknown} ช่วงดูราคาในปุ่มดูทาง` : ""}
          </p>
          {known.length > 0 && <p className="tabi-muted text-[11px]">ผู้ใหญ่ 1 คน ชั้นธรรมดา ราคาอ้างอิง ณ {thaiDate(isoDay(FARES_CHECKED))} {FARES_CHECKED.slice(0, 4)} อาจเปลี่ยนตามฤดู</p>}
        </div>
      )}
      <p className="mt-3 rounded-2xl bg-[var(--t-green)] px-3 py-2 text-sm text-[var(--t-green-ink)]">
        {jrPassWorthIt(route) ? (
          <>🎫 ทริปนี้นั่งรถไฟไกลหลายช่วง ลอง<a className="underline" href="https://japanrailpass.net/" target="_blank" rel="noopener noreferrer">เทียบราคา JR Pass</a>ก่อนซื้อตั๋ว</>
        ) : (
          <>🎫 <b>ไม่ต้องซื้อ JR Pass</b> ทริปนี้ซื้อตั๋วรายเที่ยวถูกกว่า ส่วนรถไฟในเมืองแตะบัตร IC (Suica, ICOCA) ได้เลย</>
        )}
      </p>
    </section>
  );
}

const LEVEL_JA = { 30: "警報", 40: "危険警報", 50: "特別警報" } as const;
const LEVEL_TH = { 30: "เตือนภัย", 40: "อันตราย", 50: "อันตรายสูงสุด" } as const;

/** JMA warnings (警報+) near the travel dates. Links straight to 気象庁, the page people in Japan use. */
function HazardCard({ alerts }: { alerts: HazardAlert[] }) {
  return (
    <section role="alert" className="tabi-hazard tabi-pop">
      <p className="flex items-center gap-2 font-bold"><span aria-hidden>⚠️</span>ประกาศเตือนภัยจากกรมอุตุฯ ญี่ปุ่นตอนนี้</p>
      <p className="mt-1 text-sm">รถไฟอาจหยุดหรือล่าช้า เช็กประกาศก่อนออกจากที่พักนะ</p>
      <ul className="mt-2 space-y-2">
        {alerts.map((a) => (
          <li key={`${a.city}-${a.hazard}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className={`tabi-hazard-level tabi-hazard-level--${a.level}`}>{LEVEL_JA[a.level]} · {LEVEL_TH[a.level]}</span>
            <span><b>{a.cityTh}</b> {a.hazard}</span>
            <a href={a.url} target="_blank" rel="noopener noreferrer" className="ml-auto font-semibold underline underline-offset-2">ดูประกาศ 気象庁 ↗</a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One share action: image + link to LINE/Facebook on phones; copies the link (and saves the image) elsewhere. */
function ShareButton({ onShare }: { onShare: () => Promise<ShareResult> }) {
  const [state, setState] = useState<"idle" | "busy" | ShareResult>("idle");
  return (
    <div>
      <button
        type="button"
        className="tabi-btn tabi-btn--pink w-full"
        disabled={state === "busy"}
        onClick={async () => { setState("busy"); setState(await onShare()); }}
      >
        <Send size={18} />{state === "busy" ? "กำลังทำรูปทริป…" : "แชร์ทริปให้เพื่อน"}
      </button>
      <p className="tabi-muted mt-1 min-h-[1.25rem] text-center text-xs" role="status">
        {state === "copied" ? "คัดลอกลิงก์และบันทึกรูปทริปแล้ว วางในแชทได้เลย" : state === "shared" ? "ส่งแล้ว เพื่อนเปิดลิงก์ดูแผนเดียวกันได้" : ""}
      </p>
    </div>
  );
}

// ── 5. Flights ──
/** Back of a boarding pass: airport → first city (outbound) or last city → airport (return). */
function groundLeg(trip: SavedTrip | null, dir: "outbound" | "return") {
  const route = trip?.route;
  if (!route) return undefined;
  const first = route.stops[0];
  const last = route.stops[route.stops.length - 1];
  const [from, to, title] = dir === "outbound"
    ? [`airport:${route.gateway.airport}`, first.city, `จากสนามบินเข้า${first.cityTh}`]
    : [last.city, `airport:${nearestGateway(last).g.airport}`, `จาก${last.cityTh}ไปสนามบิน`];
  const t = travelTime(from, to);
  return { title, time: t ? durationTh(t.minutes) : undefined, links: legLinks(from, to) };
}
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
/** Boarding-pass style leg (video reference). Flips (↻) to show the airport ↔ city leg in Japan. */
function BoardingPass({ leg, href, index, ground, fare }: {
  leg: NonNullable<NonNullable<TabiReply["flight"]>["legs"]>[number]; href: string; index: number;
  ground?: { title: string; time?: string; links: LegLink[] };
  fare?: { snap: FlightSnap; exact: boolean } | null;
}) {
  const out = leg.dir === "outbound";
  const date = leg.date ? isoDay(leg.date) : null;
  const [flipped, setFlipped] = useState(false);
  const color = out ? "#1a66d9" : "#17734b";
  const header = (back: boolean) => (
    <header className="flex items-center justify-between px-4 py-2 text-sm font-semibold" style={{ background: out ? "#e8f1ff" : "#dff5e8", color }}>
      <span>{back ? ground?.title : `${out ? "ขาไป" : "ขากลับ"}${date ? ` · ${thaiDate(date)} (${WEEKDAY_SHORT[date.getUTCDay()]})` : ""}`}</span>
      {ground ? (
        <button type="button" className="tabi-flip-btn" onClick={() => setFlipped((f) => !f)} aria-label={back ? "พลิกกลับไปดูตั๋ว" : ground.title}>
          ↻ {back ? "ตั๋ว" : out ? "เข้าเมือง" : "ไปสนามบิน"}
        </button>
      ) : <Plane size={16} className={out ? "" : "rotate-180"} aria-hidden />}
    </header>
  );
  return (
    <div className="tabi-flip tabi-rise" style={{ animationDelay: `${index * 90}ms` }}>
      <div className={`tabi-flip-inner ${flipped ? "is-flipped" : ""}`}>
        <article className="tabi-card tabi-pass tabi-flip-face overflow-hidden" inert={flipped}>
          {header(false)}
          <div className="flex items-center gap-3 px-4 py-4">
            <div className="text-left">
              <p className="tabi-title text-3xl font-bold leading-none">{leg.fromCode}</p>
              <p className="tabi-muted mt-1 text-xs">{leg.from}</p>
            </div>
            <div className="tabi-pass-path" aria-hidden>
              <span className="tabi-pass-plane" style={{ color }}><Plane size={20} className={out ? "" : "-scale-x-100"} /></span>
            </div>
            <div className="text-right">
              <p className="tabi-title text-3xl font-bold leading-none">{leg.toCode}</p>
              <p className="tabi-muted mt-1 text-xs">{leg.to}</p>
            </div>
          </div>
          {fare?.snap.cheapest && (
            <div className="mx-4 mb-3 rounded-2xl bg-[#fff8e6] px-3 py-2 text-sm text-[var(--t-navy)]">
              <p>
                💰 ไป-กลับเริ่ม <b>~฿{fare.snap.cheapest.toLocaleString("en-US")}</b>
                {fare.snap.nonstop && <> · บินตรง ~฿{fare.snap.nonstop.price.toLocaleString("en-US")} <span className="tabi-muted">({fare.snap.nonstop.airline})</span></>}
              </p>
              <p className="tabi-muted text-[11px]">
                ทาบิเช็กใน Google Flights เมื่อ {thaiDate(isoDay(FLIGHTS_CHECKED_AT.slice(0, 10)))} สำหรับไป {thaiDate(isoDay(fare.snap.depart))}–{thaiDate(isoDay(fare.snap.back))}
                {fare.exact ? "" : " (เดือนที่ราคาดีสุด)"} · ราคาวันของพี่ดูในปุ่มด้านล่าง
              </p>
            </div>
          )}
          <div className="tabi-pass-tear" aria-hidden />
          <a href={href} target="_blank" rel="noopener noreferrer" className="tabi-btn tabi-btn--soft mx-4 mb-4 flex" onClick={() => track("flight_clicked", { method: leg.dir })}>
            ดูเที่ยวบินใน Google Flights <ArrowRight size={18} />
          </a>
        </article>
        {ground && (
          <article className="tabi-card tabi-flip-face tabi-flip-back overflow-hidden" inert={!flipped}>
            {header(true)}
            <div className="space-y-2 px-4 py-4">
              <p className="text-3xl" aria-hidden>{out ? "🚆" : "🧳"}</p>
              {ground.time && <p className="tabi-title text-lg font-bold">ประมาณ {ground.time}</p>}
              <p className="tabi-muted text-sm">เวลาจริงและค่ารถดูได้ใน Google Maps</p>
              <LegLinks links={ground.links} />
            </div>
          </article>
        )}
      </div>
    </div>
  );
}

function FlightsScreen({ reply, trip, onPickDates, onBack, onChat, onPickDate }: {
  reply: TabiReply | null; trip: SavedTrip | null; onPickDates: (depart: string, days: number) => void;
  onBack: () => void; onChat: () => void; onPickDate: () => void;
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
      {reply?.dateOptions?.length ? (
        <section className="tabi-card space-y-2 p-4" aria-label="ช่วงวันที่ตั๋วถูก">
          <h2 className="tabi-petal font-bold">ช่วงที่ตั๋วถูกในเดือนนี้ <span className="tabi-muted text-sm font-normal">· ไป {reply.dateOptionsDays} วัน</span></h2>
          <ul className="space-y-2">
            {reply.dateOptions.map((o, i) => (
              <li key={o.depart} className="flex items-center gap-3 rounded-2xl bg-[var(--t-blue-soft)] px-3 py-2">
                {i === 0 && <span className="tabi-stamp text-[11px]">ถูกสุด</span>}
                <span className="min-w-0 flex-1 text-sm">
                  <b>{thaiDate(isoDay(o.depart))} – {thaiDate(isoDay(o.back))}</b>
                  <span className="tabi-muted"> ({WEEKDAY_SHORT[isoDay(o.depart).getUTCDay()]}–{WEEKDAY_SHORT[isoDay(o.back).getUTCDay()]})</span>
                  <span className="block font-semibold text-[var(--t-navy)]">ไป-กลับ ~฿{o.price.toLocaleString("en-US")}</span>
                </span>
                <button type="button" className="tabi-btn tabi-btn--primary min-h-[40px] px-3 text-sm" onClick={() => onPickDates(o.depart, reply.dateOptionsDays ?? 5)}>เลือกช่วงนี้</button>
              </li>
            ))}
          </ul>
          <p className="tabi-muted text-[11px]">ราคาจาก Google Flights ที่ทาบิเช็กไว้ อาจเปลี่ยนตอนจองจริง</p>
        </section>
      ) : null}
      {link?.legs?.length ? (
        <>
          <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {link.legs.map((leg, i) => (
              <BoardingPass key={leg.dir} leg={leg} index={i} href={leg.dir === "return" && link.returnUrl ? link.returnUrl : link.url} ground={groundLeg(trip, leg.dir)} fare={leg.dir === "outbound" ? flightSnapFor(leg.toCode, trip?.intent.startDate ? Number(trip.intent.startDate.slice(5, 7)) : trip?.intent.month ?? reply?.intent.month) : null} />
            ))}
          </div>
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
function tripCountdown(start: string) {
  const days = Math.round((isoDay(start).getTime() - isoDay(todayIso()).getTime()) / 86_400_000);
  return days > 0 ? `อีก ${days} วัน` : days === 0 ? "ออกเดินทางวันนี้" : "เดินทางแล้ว";
}
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
        <ul className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {trips.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => onOpen(t)} className="tabi-card flex w-full items-center gap-3 overflow-hidden p-2 pr-4 text-left">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img(t.route?.highlights[0]?.wikiTitle ?? t.route?.stops[0]?.city ?? "Japan")} alt="" loading="lazy" onError={hideBroken} className="tabi-img h-[72px] w-[88px] shrink-0 rounded-[16px]" />
                <span className="min-w-0 flex-1">
                  <span className="tabi-title block font-bold">{t.title}</span>
                  {t.intent.startDate && <span className="mt-0.5 inline-block rounded-full bg-[#ffd166] px-2 text-[11px] font-bold text-[var(--t-navy)]">{tripCountdown(t.intent.startDate)}</span>}
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

/** Profile: optional sign-in (LINE / Google) so trips follow the traveller across devices. */
function ProfileScreen({ me, tripCount, onSignOut, onDeleteAll }: {
  me: Me | null; tripCount: number; onSignOut: () => Promise<void>; onDeleteAll: () => Promise<{ ok: boolean; server: boolean }>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const privacy = <p className="tabi-muted text-xs">Nagame นับสถิติการใช้งานแบบไม่ระบุตัวตน เช่น จำนวนคนที่จัดแผนสำเร็จ เพื่อปรับปรุงทาบิ ไม่เก็บชื่อ อีเมล หรือข้อความที่พิมพ์</p>;
  return (
    <div className="tabi-rise space-y-4">
      <TopBar />
      <h1 className="text-2xl font-bold">โปรไฟล์</h1>
      {!me ? (
        <section className="tabi-card h-40 animate-pulse" />
      ) : !me.enabled ? (
        <section className="tabi-card space-y-2 p-5 text-center">
          <Avatar size={64} />
          <p className="font-bold">ยังไม่ต้องสมัครสมาชิก</p>
          <p className="tabi-muted text-sm">ทริปทั้งหมดเก็บไว้ในเครื่องนี้ เร็ว ๆ นี้จะเข้าสู่ระบบด้วย LINE เพื่อเก็บทริปไว้ใช้ได้ทุกเครื่อง</p>
          {privacy}
        </section>
      ) : !me.user ? (
        <section className="tabi-card space-y-3 p-5">
          <div className="flex items-center gap-3">
            <Avatar size={56} mood="happy" />
            <p className="text-sm"><b className="text-[var(--t-pink-ink)]">เก็บทริปไว้ใช้ได้ทุกเครื่อง</b><br />เข้าสู่ระบบครั้งเดียว ทริปจากมือถือกับคอมจะตรงกัน ไม่ต้องเข้าสู่ระบบก็ใช้ทาบิได้ครบเหมือนเดิม</p>
          </div>
          {me.providers.includes("line") && (
            <button type="button" className="tabi-btn w-full text-white" style={{ background: "#06C755" }} onClick={() => { track("login_started", { method: "line" }); void signIn("line"); }}>
              เข้าสู่ระบบด้วย LINE
            </button>
          )}
          {me.providers.includes("google") && (
            <button type="button" className="tabi-btn w-full border border-[var(--t-line)] bg-white text-[var(--t-navy)]" onClick={() => { track("login_started", { method: "google" }); void signIn("google"); }}>
              เข้าสู่ระบบด้วย Google
            </button>
          )}
          <p className="tabi-muted text-xs">เราเก็บแค่ชื่อที่แสดงกับรูปโปรไฟล์ และทริปที่พี่บันทึก ไม่เก็บอีเมลหรือเบอร์โทร ลบทั้งหมดได้ทุกเมื่อจากหน้านี้</p>
          {privacy}
        </section>
      ) : (
        <section className="tabi-card space-y-3 p-5">
          <div className="flex items-center gap-3">
            {me.user.image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={me.user.image} alt="" className="h-14 w-14 rounded-full border-2 border-white shadow-[var(--t-shadow-sm)]" />
            ) : <Avatar size={56} mood="happy" />}
            <div>
              <p className="tabi-title text-lg font-bold">{me.user.name ?? "นักเดินทาง"}</p>
              <p className="tabi-muted text-xs">เข้าสู่ระบบด้วย {me.user.via === "line" ? "LINE" : "Google"}</p>
            </div>
          </div>
          <p className="rounded-2xl bg-[var(--t-green)] px-3 py-2 text-sm text-[var(--t-green-ink)]">
            {me.sync ? `☁️ ทริปซิงก์อัตโนมัติแล้ว (${tripCount} ทริป)` : "ระบบเก็บทริปออนไลน์ยังไม่เปิด ตอนนี้ทริปยังอยู่ในเครื่องนี้"}
          </p>
          <button type="button" className="tabi-btn tabi-btn--soft w-full" onClick={() => void onSignOut()}>ออกจากระบบ</button>
          <p className="tabi-muted text-[11px]">ออกจากระบบแล้ว ทริปของบัญชีนี้จะถูกเอาออกจากเครื่องนี้ (ยังอยู่ในบัญชี)</p>
          {done ? <p role="status" className="text-sm text-[var(--t-green-ink)]">{done}</p> : (
            <button
              type="button"
              className={`tabi-btn w-full ${confirming ? "bg-[#b3261e] text-white" : "border border-[#f3c4c0] bg-white text-[#b3261e]"}`}
              onClick={async () => {
                if (!confirming) { setConfirming(true); return; }
                const r = await onDeleteAll();
                setDone(!r.ok ? "ลบไม่สำเร็จ ลองใหม่อีกครั้งนะ" : r.server ? "ลบทริปทั้งหมดแล้ว ทั้งในเครื่องนี้และออนไลน์" : "ลบทริปในเครื่องนี้แล้ว (ยังไม่ได้เปิดระบบเก็บทริปออนไลน์)");
                if (r.ok) void signOut().catch(() => {});
              }}
            >
              {confirming ? "กดอีกครั้งเพื่อยืนยัน: ลบทริปทั้งหมดทั้งในเครื่องและออนไลน์" : "ลบข้อมูลทั้งหมด"}
            </button>
          )}
          {privacy}
        </section>
      )}
    </div>
  );
}
