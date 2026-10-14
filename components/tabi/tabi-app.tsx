"use client";

// Tabi V1-lite: one conversation drives five screens (mockup 1–5).
// The server is stateless; this component owns trip context and sends it each turn.

import dynamic from "next/dynamic";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, ArrowUp, CalendarDays, ChevronLeft, CircleHelp, Heart, Home, Map as MapIcon, Pencil, Plane, Plus, Send, User } from "lucide-react";
import type { HazardAlert } from "@/lib/tabi/alerts";
import type { SafetyEvent } from "@/lib/tabi/safety";
import { dayWeather } from "@/lib/tabi/day-weather";
import { FujiMark } from "./fuji-mark";
import { EMERGENCY_TEL, JNTO_HOTLINE, SAFETY_LINKS, THAI_MISSION_TEL } from "@/lib/tabi/safety-links";
import { CITY_BY_NAME, nearestGateway } from "@/lib/tabi/cities";
import { TABI_ART, TABI_DANCE, type TabiMood } from "@/lib/tabi/mascot";
import { encodeShare, shareRef, tripTitle } from "@/lib/tabi/share";
import type { SharedTrip } from "@/lib/tabi/share-server";
import { listTrips, newTrip, saveTrip, type SavedTrip } from "@/lib/tabi/store";
import { deleteEverything, fetchMe, forgetAccountTrips, pullAndMerge, pushTrip, visibleTo, type Me } from "@/lib/tabi/sync";
import { track } from "@/lib/tabi/track";
import { EARNED_EVENT, MANHOLES, OMAMORI, earnOmamori, manholeImg, omamoriImg, readCollection, stampManhole, travellingNow, tripCities, type Collection, type Earned } from "@/lib/tabi/collect";
import { signIn, signOut } from "next-auth/react";
import { FARES_CHECKED, legFare, yenRange, type LegFare } from "@/lib/tabi/fares";
import { FLIGHTS_CHECKED_AT, flightMonths, flightSnapFor, type FlightSnap } from "@/lib/tabi/flight-snapshot";
import { durationTh, travelTime } from "@/lib/tabi/rail-times";
import { STAY_AREA } from "@/lib/tabi/stay";
import { AIRPORTS, jrPassWorthIt, legLinks, stayNear, type LegLink } from "@/lib/tabi/transport";
import type { DaySlot, Highlight, ItineraryDay, ItineraryItem, PlaceCard, RouteOption, TabiReply, TripIntent } from "@/lib/tabi/types";
import type { MapPin, MapPoint } from "./tabi-map";
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

/** Wikipedia lead photo; `fallback` (usually the city) is used when the page's image is a logo or a map. */
const img = (wikiTitle: string, fallback?: string) => `/api/tabi/image?title=${encodeURIComponent(wikiTitle)}${fallback && fallback !== wikiTitle ? `&fallback=${encodeURIComponent(fallback)}` : ""}`;
/** No Wikipedia image → hide the <img>; the .tabi-img gradient behind it stays as the fallback. */
const hideBroken = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.visibility = "hidden";
};

/** A trip opened from a share link starts on its day plan as an unsaved copy (saved on first keep/edit). */
function fromShared(shared: SharedTrip): SavedTrip {
  return { ...newTrip(shared.intent), title: shared.title, route: shared.route, itinerary: shared.itinerary, savedStops: shared.savedStops, status: "draft" };
}

export function TabiApp({ shared, initialAsk, source, initialTab, liveSearch }: { shared?: SharedTrip; initialAsk?: string; source?: string; initialTab?: "trips" | "profile"; /** the live-search worker is configured (fares/restaurants checked live) */ liveSearch?: boolean } = {}) {
  // ?tab=trips / ?tab=profile (links from the month guides) open that tab directly
  const [screen, setScreen] = useState<Screen>(shared ? "itinerary" : initialTab === "trips" ? "trips" : initialTab === "profile" ? "soon" : "home");
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
      if (reply.action === "answer") { track("question_answered", { method: reply.links?.length ? "with_link" : "text" }); earnOmamori("gakugyo"); }

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
        earnOmamori("kaiun");
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
    earnOmamori("ryoko");
    void send("ดูตั๋วเครื่องบินให้หน่อย", intent);
  }

  function openTrip(t: SavedTrip) {
    if (travellingNow(t)) earnOmamori("shingan");
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
        {screen === "home" && <HomeScreen onAsk={send} onCollection={() => { go("trips"); setTimeout(() => document.getElementById("tabi-collection")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120); }} />}
        {screen === "chat" && (
          <ChatScreen turns={turns} loading={loading} error={error} routes={routes} onAsk={send} onPick={openRoute} onBack={nav("home")} liveSearch={liveSearch} />
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
              if (r !== "failed") { cheer(r === "shared" ? "ส่งให้เพื่อนแล้ว!" : "คัดลอกลิงก์แล้ว!"); earnOmamori("enmusubi"); }
              return r;
            }}
            onEdit={(itinerary, method) => { track("plan_edited", { method }); void persist({ ...trip, itinerary }); }}
            onSetDate={(iso) => {
              track("date_set", { month: Number(iso.slice(5, 7)) });
              earnOmamori("ryoko");
              // the date fixes month and length too, so the next turn (e.g. "หาตั๋ว") searches these exact days
              const intent = { ...trip.intent, startDate: iso, month: Number(iso.slice(5, 7)), durationDays: trip.itinerary?.length ?? trip.intent.durationDays };
              void persist({ ...trip, intent, status: "planned" });
              setLastReply((r) => (r ? { ...r, intent } : r));
            }}
          />
        )}
        {screen === "flights" && <FlightsScreen reply={lastReply} trip={trip} onPickDates={pickDates} onBack={nav(trip?.itinerary ? "itinerary" : "chat")} onChat={nav("chat")} onPickDate={nav("itinerary")} />}
        {screen === "trips" && <TripsScreen trips={trips} onOpen={openTrip} onNew={nav("home")} />}
        <EarnToast onOpen={() => { go("trips"); setTimeout(() => document.getElementById("tabi-collection")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120); }} />
        {screen === "soon" && (
          <ProfileScreen
            me={me}
            tripCount={trips.length}
            onSignOut={async () => {
              // only an account copy online makes removing them safe; on-device trips stay (hidden until the same account signs in)
              if (account.current && syncOn.current) await forgetAccountTrips(account.current);
              await signOut().catch(() => {});
            }}
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
          <NavButton icon={<MapIcon size={22} />} label="วางแผนทริป" active={["chat", "route", "itinerary", "flights"].includes(screen)} onClick={nav("chat")} />
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
/* ── Yen shown with baht beside it: today's ECB reference rate from /api/tabi/fx, fetched once per visit.
   Without a rate the yen figure stays alone — never a guessed rate. ── */
type Fx = { rate: number; date: string };
let fxOnce: Promise<Fx | null> | null = null;
function useFx(): Fx | null {
  const [fx, setFx] = useState<Fx | null>(null);
  useEffect(() => {
    let live = true;
    fxOnce ??= fetch("/api/tabi/fx").then((r) => r.json()).then((d: { rate?: number | null; date?: string }) => (d.rate ? { rate: d.rate, date: d.date ?? "" } : null)).catch(() => null);
    fxOnce.then((v) => { if (live && v) setFx(v); });
    return () => { live = false; };
  }, []);
  return fx;
}
/** round to ฿10 for small amounts, ฿100 above ฿1,000 (these are estimates, not prices) */
function bahtOf(yen: number, rate: number) {
  const b = yen * rate;
  const step = b < 1000 ? 10 : 100;
  return Math.round(b / step) * step;
}
const num = (n: number) => n.toLocaleString("en-US");
/** "¥580" → "¥580 (~฿120)", "¥13,320–14,170" → "… (~฿2,800–3,000)", "50,000 เยน" → "50,000 เยน (~฿10,600)" */
function withBaht(text: string, rate?: number) {
  if (!rate) return text;
  return text.replace(/¥\s?(\d[\d,]*)(?:–(\d[\d,]*))?|(\d[\d,]{2,})\s*เยน/g, (m: string, a: string | undefined, b: string | undefined, c: string | undefined, at: number) => {
    const lo = bahtOf(Number((a ?? c)!.replace(/,/g, "")), rate);
    const hi = b ? bahtOf(Number(b.replace(/,/g, "")), rate) : lo;
    const next = text[at + m.length]; // "50,000 เยนขึ้นไป" keeps a space before the next word
    return `${m} (~฿${num(lo)}${hi !== lo ? `–${num(hi)}` : ""})${next && /[฀-๿a-z]/i.test(next) ? " " : ""}`;
  });
}

const PLACE_ICON = { eat: "🍜", buy: "🛍️", sleep: "🛏️", see: "⛩️" } as const;

/** Straight line ×1.3 at 80 m/min for a walk; beyond ~1.5 km just the distance (a bus or train is likelier). */
function stopDistance({ name, km }: { name: string; km: number }) {
  if (km <= 1.5) return `เดิน ~${Math.max(5, Math.round((km * 1300) / 80 / 5) * 5)} นาทีจาก ${name}`;
  return `~${km} กม. จาก ${name}`;
}

/** Restaurants / shops / stays in an answer: one card each, rating first, the whole card opens Google Maps. */
function PlaceCards({ places }: { places: PlaceCard[] }) {
  const fx = useFx();
  // one small overview map of all of them (the cards are what you tap)
  const points: MapPoint[] = useMemo(
    () => places.filter((p) => p.lat && p.lon).map((p) => ({ lat: p.lat!, lon: p.lon!, label: p.name, kind: "place" as const })),
    [places],
  );
  return (
    <>
    {points.length >= 2 && <div className="w-full pt-1"><TabiMap points={points} height={150} interactive={false} maxZoom={14} /></div>}
    <ul className="grid w-full gap-2 pt-1 sm:grid-cols-2" aria-label="รายชื่อสถานที่">
      {places.map((p) => (
        <li key={p.url} className="min-w-0">
          <a href={p.url} target="_blank" rel="noopener noreferrer" className="tabi-card tabi-place-card">
            <span className="tabi-place-icon" aria-hidden>{PLACE_ICON[p.kind]}</span>
            <span className="min-w-0 flex-1">
              <span className="tabi-title block truncate font-bold leading-snug">{p.name}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                {p.rating !== undefined ? <span className="font-semibold text-[var(--t-navy)]"><span aria-hidden>⭐</span> {p.rating.toFixed(1)}<span className="tabi-muted font-normal"> ({p.reviews?.toLocaleString("en-US")} รีวิว)</span></span>
                  : <span className="tabi-guide-tag"><span aria-hidden>📖</span> ไกด์แนะนำ</span>}
                {p.tag && <span className="tabi-place-tag">{p.tag}</span>}
                {p.price && <span className="tabi-muted">{withBaht(p.price, fx?.rate)}</span>}
                {p.area && <span className="tabi-muted">· {p.area}</span>}
                {p.fromStop && <span className="tabi-muted basis-full">📍 {stopDistance(p.fromStop)}</span>}
              </span>
            </span>
            <span className="tabi-muted shrink-0 text-xs" aria-hidden>แผนที่ ↗</span>
          </a>
        </li>
      ))}
    </ul>
    </>
  );
}

/* ── Squishy Tabi (soft-toy feel): leans away from the pointer, squashes when pressed,
   springs back with a wobble when let go. One under-damped spring per axis. ── */
type Pose = { x: number; y: number; r: number; sx: number; sy: number };
const REST: Pose = { x: 0, y: 0, r: 0, sx: 1, sy: 1 };
const PRESSED: Pose = { x: 0, y: 14, r: 0, sx: 1.24, sy: 0.72 };
const SPRING = { k: 380, c: 13, m: 0.8 }; // damping ratio ≈ 0.37 → two or three visible bounces

/** `touchOnly`: the phone traveler sits at the end of <body>, so it stays out of the Tab order (a finger toy there). */
function DancingTabi({ squish = true, touchOnly = false }: { squish?: boolean; touchOnly?: boolean }) {
  const body = useRef<HTMLSpanElement>(null);
  const goal = useRef<Pose>(REST);
  const held = useRef<number | null>(null);
  const kick = useRef<() => void>(() => {});

  useEffect(() => {
    const el = body.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const keys = ["x", "y", "r", "sx", "sy"] as const;
    const pos = { ...REST };
    const vel = { x: 0, y: 0, r: 0, sx: 0, sy: 0 };
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      const dt = last ? Math.min(0.032, (t - last) / 1000) : 0.016;
      last = t;
      let moving = false;
      for (const k of keys) {
        const f = -SPRING.k * (pos[k] - goal.current[k]) - SPRING.c * vel[k];
        vel[k] += (f / SPRING.m) * dt;
        pos[k] += vel[k] * dt;
        if (Math.abs(vel[k]) > 0.002 || Math.abs(pos[k] - goal.current[k]) > 0.002) moving = true;
      }
      el.style.transform = `translate(${pos.x}px, ${pos.y}px) rotate(${pos.r}deg) scale(${pos.sx}, ${pos.sy})`;
      raf = moving ? requestAnimationFrame(tick) : 0;
      if (!moving) last = 0;
    };
    kick.current = () => { if (!raf) raf = requestAnimationFrame(tick); };
    return () => cancelAnimationFrame(raf);
  }, []);

  const aim = (p: Pose) => { goal.current = p; kick.current(); };
  const lean = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (held.current !== null || e.pointerType === "touch") return;
    const b = e.currentTarget.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, ((e.clientX - b.left) / b.width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((e.clientY - b.top) / b.height) * 2 - 1));
    aim({ x: -14 * nx, y: -8 * ny, r: -7 * nx, sx: 1.03, sy: 0.97 }); // shies away from the cursor
  };
  const let_go = () => { held.current = null; aim(REST); };

  return (
    <span className="tabi-dancer">
      <span ref={body} className="tabi-dancer-body">
        <span className="tabi-sprite" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={TABI_DANCE.sprite} alt="" />
        </span>
      </span>
      {squish && (
        <button
          type="button"
          className="tabi-dancer-target"
          aria-label="บีบทาบิแล้วปล่อยให้เด้ง"
          tabIndex={touchOnly ? -1 : undefined}
          onPointerEnter={lean}
          onPointerMove={lean}
          onPointerLeave={() => { if (held.current === null) aim(REST); }}
          onPointerDown={(e) => {
            if (!e.isPrimary || e.button !== 0 || held.current !== null) return;
            held.current = e.pointerId;
            e.currentTarget.setPointerCapture(e.pointerId);
            aim(PRESSED);
          }}
          onPointerUp={(e) => { if (held.current === e.pointerId) let_go(); }}
          onPointerCancel={let_go}
          onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) aim(PRESSED); }}
          onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") aim(REST); }}
        />
      )}
    </span>
  );
}

/**
 * Phones: one Tabi rides down the home page as you scroll — it leaves the hero and settles on the
 * next `[data-tabi-dock]` as that spot comes up, hopping in an arc on the way. Docks keep their own
 * still art, so desktop, reduced motion and data saver simply show Tabi in place.
 */
function TabiTraveler() {
  const [on, setOn] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const [atHero, setAtHero] = useState(true);

  useEffect(() => {
    const phone = window.matchMedia("(max-width: 1023px)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const saver = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    const sync = () => setOn(phone.matches && !calm.matches && !saver && document.querySelectorAll("[data-tabi-dock]").length > 1);
    sync();
    phone.addEventListener("change", sync);
    calm.addEventListener("change", sync);
    return () => { phone.removeEventListener("change", sync); calm.removeEventListener("change", sync); };
  }, []);

  useEffect(() => {
    if (!on) return;
    const root = document.documentElement;
    root.dataset.tabiTraveler = "on";
    let raf = 0;
    let hero = true;
    const ease = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
    const frame = () => {
      const el = box.current;
      const docks = [...document.querySelectorAll<HTMLElement>("[data-tabi-dock]")].map((d) => d.getBoundingClientRect());
      if (el && docks.length) {
        const h = window.innerHeight;
        // the last dock whose middle has come up into the screen is where Tabi is heading
        let j = 0;
        docks.forEach((d, i) => { if (d.top + d.height / 2 < h) j = i; });
        const to = docks[j];
        const from = docks[Math.max(0, j - 1)];
        const p = j === 0 ? 1 : ease(Math.max(0, Math.min(1, (h - (to.top + to.height / 2)) / (0.3 * h))));
        const lerp = (a: number, b: number) => a + (b - a) * p;
        const size = lerp(from.height, to.height);
        const x = lerp(from.left + from.width / 2, to.left + to.width / 2) - size / 2;
        const y = lerp(from.top + from.height / 2, to.top + to.height / 2) - size / 2 - Math.sin(Math.PI * p) * h * 0.08;
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        el.style.width = el.style.height = `${size}px`;
        const nowHero = j === 0 || p === 0;
        if (nowHero !== hero) { hero = nowHero; setAtHero(nowHero); }
      }
      raf = requestAnimationFrame(frame);
    };
    const visibility = () => {
      cancelAnimationFrame(raf);
      raf = document.hidden ? 0 : requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", visibility);
      delete root.dataset.tabiTraveler;
    };
  }, [on]);

  if (!on) return null;
  // portalled to <body>: an animated ancestor (transform) would otherwise trap `position: fixed`
  return createPortal(
    <div className="tabi-traveler" aria-hidden={!atHero}>
      <div ref={box} className="tabi-traveler-box">
        <DancingTabi squish={atHero} touchOnly />
      </div>
    </div>,
    document.body,
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
function HomeScreen({ onAsk, onCollection }: { onAsk: (m: string) => void; onCollection: () => void }) {
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
        <p className="absolute bottom-2 left-3 rounded-full bg-black/40 px-2 text-[10px] text-white">ภาพ: Wikipedia</p>
        <div data-tabi-dock="hero" className="tabi-hero-cat"><DancingTabi /></div>
      </section>
      <TabiTraveler />
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
        <span data-tabi-dock="hello" className="tabi-dock-hello"><Avatar size={56} mood="happy" animated /></span>
        <div>
          <p className="font-bold text-[var(--t-pink-ink)]">สวัสดี! ทาบิเองนะ</p>
          <p className="text-sm">ทาบิจะเสนอเส้นทางไม่เกิน 3 แบบ เลือกแล้วจัดเป็นแผนรายวันให้ ปรับได้ด้วยการพิมพ์บอก</p>
        </div>
      </section>
      <CollectTeaser onOpen={onCollection} />
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
/** Tabi's face follows the answer: pleased when it found routes or places, unsure when it has to ask back. */
function replyMood(reply?: TabiReply): TabiMood {
  if (!reply) return "idle";
  if (reply.action === "ask") return "worried";
  if (reply.action === "suggest_routes" || reply.places?.length || reply.itinerary?.length || reply.dateOptions?.length) return "happy";
  return "idle";
}

/** While Tabi looks something up live (fares, restaurants), say where — a few seconds feel shorter with a reason. */
function waitingText(message: string | undefined, live: boolean) {
  if (!live || !message) return null;
  if (/ตั๋ว|เครื่องบิน|เที่ยวบิน|ราคาบิน|flight/i.test(message)) return "ทาบิกำลังเช็กราคาตั๋วใน Google Flights…";
  if (!/ของฝาก|ช้อป|ช็อป|ที่พัก|โรงแรม/.test(message) && /ร้าน|กิน|อาหาร|ราเม|ซูชิ|คาเฟ่|อิซากายะ|ยากินิกุ|ซีฟู้ด/.test(message)) return "ทาบิกำลังหาร้านใน Google Maps…";
  return null;
}

function ChatScreen({ turns, loading, error, routes, onAsk, onPick, onBack, liveSearch = false }: {
  turns: Turn[]; loading: boolean; error: string | null; routes: RouteOption[];
  onAsk: (m: string) => void; onPick: (r: RouteOption) => void; onBack: () => void; liveSearch?: boolean;
}) {
  const fx = useFx();
  const waiting = loading ? waitingText([...turns].reverse().find((t) => t.role === "user")?.text, liveSearch) : null;
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
        {/* opened from the "วางแผนทริป" tab before any question: Tabi starts the conversation */}
        {!turns.length && !loading && (
          <li className="tabi-rise flex items-start gap-2">
            <Avatar size={38} mood="happy" />
            <div className="max-w-[82%] space-y-1">
              <p className="text-xs font-semibold text-[var(--t-pink-ink)]">ทาบิ</p>
              <p className="tabi-card rounded-tl-md px-4 py-2.5">อยากไปญี่ปุ่นช่วงไหน กี่วัน ชอบเที่ยวแนวไหน พิมพ์บอกทาบิได้เลย หรือกดเรื่องที่สนใจด้านล่าง</p>
            </div>
          </li>
        )}
        {turns.map((t, i) =>
          t.role === "user" ? (
            <li key={i} className="tabi-rise flex justify-end">
              <p className="max-w-[80%] rounded-[20px] rounded-br-md bg-[var(--t-blue)] px-4 py-2.5 text-white">{t.text}</p>
            </li>
          ) : (
            <li key={i} className="tabi-rise flex items-start gap-2">
              {/* only the newest reply moves: a column of moving cats is noisy and costly on phones */}
              <Avatar size={38} mood={replyMood(t.reply)} animated={i === lastTabi && !loading} />
              <div className="max-w-[82%] space-y-1">
                <p className="text-xs font-semibold text-[var(--t-pink-ink)]">ทาบิ</p>
                {t.text.split("\n").map((b, j) => (
                  <p key={j} className="tabi-card rounded-tl-md px-4 py-2.5">{withBaht(b, fx?.rate)}</p>
                ))}
                {t.reply?.places?.length ? <PlaceCards places={t.reply.places} /> : null}
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
            <span className="tabi-card tabi-typing px-4 py-3" aria-label={waiting ?? "ทาบิกำลังคิด"}><span /><span /><span /></span>
            {waiting && <span className="tabi-muted text-sm" aria-hidden>{waiting}</span>}
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
      {!turns.length && !loading && (
        <div className="grid grid-cols-3 gap-2">
          {INSPIRATION.map((c) => (
            <button key={c.label} type="button" className="tabi-chip justify-center" onClick={() => onAsk(c.prompt)}>
              <span aria-hidden className="tabi-emoji">{c.emoji}</span>{c.label}
            </button>
          ))}
        </div>
      )}
      <div ref={end} className="h-16" aria-hidden />
      <div className="sticky bottom-[84px] pt-2 lg:bottom-6"><Composer onAsk={onAsk} loading={loading} placeholder={turns.length ? undefined : "เช่น 5 วัน พ.ค. เน้นธรรมชาติ"} /></div>
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
  // routes from one region often share their first city; the last city tells them apart at a glance
  const last = route.stops[route.stops.length - 1];
  const hero = route.highlights.find((h) => h.city === last.city && h.wikiTitle) ?? (route.stops.length > 1 ? null : route.highlights.find((h) => h.wikiTitle));
  const heroImg = hero ? img(hero.wikiTitle, hero.city) : img(last.city);
  return (
    <button
      type="button"
      onClick={() => { setChosen(true); setTimeout(onPick, 220); }}
      className={`tabi-card tabi-rise flex w-full overflow-hidden text-left ${chosen ? "tabi-select ring-2 ring-[var(--t-blue)]" : ""}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="relative w-[34%] shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroImg} alt="" loading="lazy" onError={hideBroken} className="tabi-img absolute inset-0 h-full w-full" />
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
  const [pins, setPins] = useState<MapPin[]>([]);
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
      <div className="tabi-card p-2">
        <MapPinToggles cities={route.stops.map((s) => s.city)} onPins={setPins} />
        <TabiMap points={points} pins={pins} height={desktop ? 420 : 240} />
      </div>
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
              <img src={img(h.wikiTitle, h.city)} alt="" loading="lazy" onError={hideBroken} className="tabi-img h-[88px] w-[96px] shrink-0 rounded-[14px]" />
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
  // weather warnings, quakes and tsunami matter only when the trip is close (a week before until the
  // last day); a volcano warning lasts for months, so it shows whenever the route passes one
  const nearTrip = countdown !== null && countdown <= 7 && countdown > -days.length;
  const alertCities = trip.route?.stops.map((s) => s.city).join(",") ?? "";
  const [safety, setSafety] = useState<{ alerts: HazardAlert[]; events: SafetyEvent[] }>({ alerts: [], events: [] });
  useEffect(() => {
    if (!alertCities) return;
    let live = true;
    fetch(`/api/tabi/alerts?cities=${encodeURIComponent(alertCities)}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: { alerts?: HazardAlert[]; events?: SafetyEvent[] }) => { if (live) setSafety({ alerts: d.alerts ?? [], events: d.events ?? [] }); })
      .catch(() => { /* nothing shown is the safe failure: JMA and the numbers stay on the card */ });
    return () => { live = false; };
  }, [alertCities]);
  const liveLegs = useLiveFares(trip.route);
  const alerts = nearTrip ? safety.alerts : [];
  const events = safety.events.filter((e) => nearTrip || e.kind === "volcano");
  return (
    <div className="tabi-rise space-y-4">
      <TopBar onBack={onBack} />
      <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8 lg:space-y-0">
      <div className="space-y-4">
      <section className="tabi-card overflow-hidden">
        <div className="relative h-[120px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {trip.route?.highlights[0] && <img src={img(trip.route.highlights[0].wikiTitle, trip.route.highlights[0].city)} alt="" onError={hideBroken} className="tabi-img absolute inset-0 h-full w-full" />}
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
          {!start && <DateCharmHint />}
        </div>
      </section>
      {(alerts.length > 0 || events.length > 0) && <HazardCard alerts={alerts} events={events} />}
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
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="tabi-title font-bold leading-snug">{d.title}</span>
                      {(() => {
                        const w = dayWeather(d.city, start ? isoDay(start, i).getMonth() + 1 : month);
                        return w && <span className="tabi-day-weather" title={w.label} aria-label={w.label}><span className="tabi-day-weather-icon" aria-hidden>{w.icon}</span><b className="tabi-day-weather-hi">{w.hi}°</b><span className="tabi-day-weather-lo">{w.lo}°</span></span>;
                      })()}
                    </span>
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
                            <span className="mt-1 flex flex-wrap gap-1.5">
                              <a className="tabi-leg-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`restaurants near ${it.mapQuery}`)}`} target="_blank" rel="noopener noreferrer">🔎 หาร้านแถวนี้ ↗</a>
                              {/* link only: Tabelog's terms forbid reusing its listings */}
                              <a className="tabi-leg-link" href={`https://tabelog.com/en/rstLst/?sw=${encodeURIComponent(d.city)}`} target="_blank" rel="noopener noreferrer">⭐ Tabelog ↗</a>
                            </span>
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
      <BudgetCard trip={trip} liveLegs={liveLegs} />
      {trip.route && <TransportCard route={trip.route} onAsk={onAsk} liveLegs={liveLegs} />}
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
      <SafetyCard />

      <div className="grid grid-cols-3 gap-2">
        <button type="button" className="tabi-btn tabi-btn--soft whitespace-nowrap px-2 text-sm" onClick={onMap}><MapIcon size={18} />แผนที่</button>
        <button type="button" className="tabi-btn tabi-btn--pink whitespace-nowrap px-2 text-sm" onClick={() => onAsk("ดูตั๋วเครื่องบินให้หน่อย")}><Plane size={18} />หาตั๋ว</button>
        <button type="button" className="tabi-btn tabi-btn--primary whitespace-nowrap px-2 text-sm" onClick={() => onAsk("อยากปรับแผนหน่อย")}><Pencil size={18} />ปรับแผน</button>
      </div>
      <ShareButton onShare={onShare} />
      <LineSendButton trip={trip} />
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

type LiveLeg = { from: string; to: string; yen: number; duration: string | null; line: string | null; checkedAt: string } | null;

/**
 * Train fare of each leg between the route's cities, checked live on Google Maps by the live-search
 * worker (/api/tabi/fares). Empty until it answers — and for good when no worker is configured —
 * so the cards keep the fare table meanwhile.
 */
function useLiveFares(route?: RouteOption): LiveLeg[] {
  const legs = route ? route.stops.slice(1).map((s, i) => `${route.stops[i].city}>${s.city}`).join(",") : "";
  const [live, setLive] = useState<{ key: string; legs: LiveLeg[] }>({ key: "", legs: [] });
  useEffect(() => {
    if (!legs) return;
    let on = true;
    fetch(`/api/tabi/fares?legs=${encodeURIComponent(legs)}`)
      .then((r) => (r.ok ? r.json() : { legs: [] }))
      .then((d: { legs?: LiveLeg[] }) => { if (on) setLive({ key: legs, legs: d.legs ?? [] }); })
      .catch(() => {});
    return () => { on = false; };
  }, [legs]);
  return live.key === legs ? live.legs : [];
}

/** A leg's fare: the live one when checked, else the table's range. */
function legFareOf(route: RouteOption, i: number, live: LiveLeg[]): (LegFare & { live?: LiveLeg }) | null {
  const l = live[i];
  return l ? { min: l.yen, max: l.yen, sources: ["Google Maps"], live: l } : legFare(route.stops[i].city, route.stops[i + 1].city);
}

/** Subway-map style overview: airport → cities → airport, each hop opens live trains, plus one JR Pass verdict. */
function TransportCard({ route, onAsk, liveLegs = [] }: { route: RouteOption; onAsk?: (m: string) => void; liveLegs?: LiveLeg[] }) {
  const first = route.stops[0];
  const last = route.stops[route.stops.length - 1];
  const out = nearestGateway(last).g.airport;
  const airportNames = (code: string) => (AIRPORTS[code] ?? []).map((a) => a.th).join(" / ");
  // train fares between cities: only legs with a checked fare count; the rest point to Google Maps
  const legFares = route.stops.slice(1).map((_, i) => legFareOf(route, i, liveLegs));
  const known = legFares.filter((f): f is LegFare => !!f);
  const unknown = legFares.length - known.length;
  const liveAt = liveLegs.find((l) => l)?.checkedAt;
  const fx = useFx();
  const hops: { label: string; fare?: string; line?: string; links: LegLink[] }[] = [
    { label: hopLabel(`airport:${route.gateway.airport}`, first.city, "เข้าเมือง"), links: legLinks(`airport:${route.gateway.airport}`, first.city) },
    ...route.stops.slice(1).map((s, i) => {
      const fare = legFares[i];
      const live = fare && "live" in fare ? fare.live : null;
      const label = live?.duration
        ? `🚆 ไปเมืองถัดไป ${live.duration.replace(" hr", " ชม.").replace(" min", " นาที")}`
        : hopLabel(route.stops[i].city, s.city, "ไปเมืองถัดไป");
      return { label, fare: fare ? yenRange(fare) : undefined, line: live?.line?.replace(/\s{2,}/g, " + "), links: legLinks(route.stops[i].city, s.city) };
    }),
    { label: hopLabel(last.city, `airport:${out}`, "ไปสนามบิน"), links: legLinks(last.city, `airport:${out}`) },
  ];
  const nodes = [
    { key: "in", icon: "🛬", title: `สนามบิน${airportNames(route.gateway.airport)}` },
    ...route.stops.map((s) => ({ key: s.city, icon: "", title: `${s.cityTh} · ${s.nights} คืน`, stay: STAY_AREA[s.city] ?? stayNear(s.city), cityTh: s.cityTh })),
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
            {"cityTh" in n && onAsk && (
              <span className="flex flex-wrap gap-1.5">
                <button type="button" className="tabi-leg-link" onClick={() => onAsk(`ที่พักแถว${n.cityTh}`)}>🛏️ ที่พักแถวนี้</button>
                <button type="button" className="tabi-leg-link" onClick={() => onAsk(`ร้านอาหารแถว${n.cityTh}`)}>🍜 ร้านแถวนี้</button>
              </span>
            )}
            {i < hops.length && (
              <span className="tabi-track-hop">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="tabi-hop-pill">{hops[i].label}</span>
                  {hops[i].fare && <span className="tabi-hop-pill tabi-hop-fare"><span aria-hidden>💴</span> {withBaht(hops[i].fare!, fx?.rate)}</span>}
                </span>
                {hops[i].line && <span className="tabi-muted text-xs">{hops[i].line}</span>}
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
              ? <b>~{withBaht(yenRange({ min: known.reduce((a, f) => a + f.min, 0), max: known.reduce((a, f) => a + f.max, 0) }), fx?.rate)}</b>
              : "ดูราคาในปุ่มดูทาง (Google Maps บอกค่ารถ)"}
            {known.length > 0 && unknown > 0 ? ` + อีก ${unknown} ช่วงดูราคาในปุ่มดูทาง` : ""}
          </p>
          {known.length > 0 && (
            <p className="tabi-muted text-[11px]">
              {liveAt
                ? `ผู้ใหญ่ 1 คน ทาบิเช็กใน Google Maps เมื่อ ${thaiDate(isoDay(liveAt.slice(0, 10)))} (เที่ยวรถไฟ 10 โมงเช้า)`
                : `ผู้ใหญ่ 1 คน ชั้นธรรมดา ราคาอ้างอิง ณ ${thaiDate(isoDay(FARES_CHECKED))} ${FARES_CHECKED.slice(0, 4)} อาจเปลี่ยนตามฤดู`}
            </p>
          )}
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

/**
 * Rough cost per person, in baht. Every figure has a source: the fare Tabi checked on Google Flights,
 * the train fares between cities, and for stays and food the Japan Tourism Agency's average for
 * foreign visitors (インバウンド消費動向調査, Jan–Mar 2025: lodging ¥74,370 over 6.9 nights, food
 * ¥50,138 per trip ≈ ¥10,800 a night and ¥6,300 a day). Yen → baht at today's ECB rate; without a rate
 * the yen figures stay.
 */
const STAY_YEN_NIGHT = 10_800;
const FOOD_YEN_DAY = 6_300;

/* ── Scratch card, like a phone top-up card: the trip total hides under a foil and shows only once
   about 90% of it is rubbed off — no shortcut button (owner decision). Keyboard: Space / Enter / arrows
   rub one strip at a time. Once opened it stays open for that trip on this device. The figure stays in
   the page for screen readers. ── */
const SCRATCH_KEY = "nagame-tabi-scratched-v1";
function scratched(): string[] {
  try { return JSON.parse(localStorage.getItem(SCRATCH_KEY) ?? "[]") as string[]; } catch { return []; }
}
function ScratchReveal({ id, hint, children }: { id: string; hint: string; children: React.ReactNode }) {
  const [open, setOpen] = useState<boolean | null>(null); // null until this device's record is read
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef(0);
  useEffect(() => { setOpen(scratched().includes(id)); }, [id]);
  const reveal = useCallback(() => {
    setOpen(true);
    earnOmamori("kinun");
    try { localStorage.setItem(SCRATCH_KEY, JSON.stringify([...scratched().filter((x) => x !== id), id].slice(-30))); } catch { /* private mode: opens for this visit only */ }
  }, [id]);
  useEffect(() => {
    const c = canvas.current;
    if (open !== false || !c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = c.getBoundingClientRect();
    c.width = Math.round(width * dpr);
    c.height = Math.round(height * dpr);
    const g = c.getContext("2d");
    if (!g) return;
    g.scale(dpr, dpr);
    const foil = g.createLinearGradient(0, 0, width, height);
    foil.addColorStop(0, "#1a66d9");
    foil.addColorStop(1, "#ff5c9d");
    g.fillStyle = foil;
    g.fillRect(0, 0, width, height);
    g.fillStyle = "rgba(255,255,255,0.16)";
    for (let x = -height; x < width; x += 12) { g.beginPath(); g.moveTo(x, height); g.lineTo(x + height, 0); g.lineTo(x + height + 4, 0); g.lineTo(x + 4, height); g.fill(); }
    g.fillStyle = "#fff";
    g.font = `700 14px ${getComputedStyle(c).fontFamily}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(hint, width / 2, height / 2);
    g.globalCompositeOperation = "destination-out";
    strokes.current = 0;
  }, [open, hint]);
  const rub = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "mouse" && e.buttons !== 1) return;
    const c = e.currentTarget;
    const g = c.getContext("2d");
    if (!g) return;
    const box = c.getBoundingClientRect();
    g.beginPath();
    g.arc(e.clientX - box.left, e.clientY - box.top, 16, 0, Math.PI * 2);
    g.fill();
    if (++strokes.current % 3 === 0) check(c, g);
  };
  // how much foil is left (sampled, cheap); once 90% is gone the card opens
  const check = (c: HTMLCanvasElement, g: CanvasRenderingContext2D) => {
    const px = g.getImageData(0, 0, c.width, c.height).data;
    let clear = 0, seen = 0;
    for (let i = 3; i < px.length; i += 64) { seen++; if (px[i] < 40) clear++; }
    if (clear / seen >= 0.9) reveal();
  };
  const strip = useRef(0);
  const rubKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (![" ", "Enter", "ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const c = e.currentTarget;
    const g = c.getContext("2d");
    if (!g) return;
    const { width, height } = c.getBoundingClientRect();
    g.fillRect((strip.current++ % 8) * (width / 8), 0, width / 8 + 1, height);
    check(c, g);
  };
  return (
    <span className="tabi-scratch">
      <span className="tabi-scratch-under">
        {children}
        {open === false && <canvas ref={canvas} className="tabi-scratch-foil" tabIndex={0} role="button" aria-label="ขูดเพื่อดูยอดรวม กด Space ซ้ำ ๆ เพื่อขูด" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); rub(e); }} onPointerMove={rub} onPointerUp={(e) => { const g = e.currentTarget.getContext("2d"); if (g) check(e.currentTarget, g); }} onKeyDown={rubKey} />}
      </span>
      {open && <span className="tabi-scratch-pop" aria-hidden>✨</span>}
    </span>
  );
}

const BUDGET_PART = {
  flight: { icon: "✈️", color: "#1a66d9", name: "ตั๋วเครื่องบิน", tip: "ตั๋วเครื่องบินแพงสุดในทริปนี้ เปลี่ยนวันบินแล้วราคาต่างกันมาก ดูวันถูกได้ในหน้าตั๋ว" },
  rail: { icon: "🚃", color: "#22b07d", name: "รถไฟ", tip: "ค่ารถไฟแพงสุดในทริปนี้ ถ้าตัดเมืองที่อยู่ไกลออกจะประหยัดได้" },
  stay: { icon: "🛏️", color: "#ff5c9d", name: "ที่พัก", tip: "ที่พักแพงสุดในทริปนี้ ตัวเลขนี้เป็นค่าเฉลี่ย กด “ดูราคาจริง” เพื่อดูราคาของวันที่ไป" },
  food: { icon: "🍜", color: "#ff9e45", name: "อาหาร", tip: "อาหารแพงสุดในทริปนี้ ตัวเลขนี้เป็นค่าเฉลี่ย กินร้านธรรมดาจะถูกกว่านี้" },
} as const;
type BudgetKey = keyof typeof BUDGET_PART;

function BudgetCard({ trip, liveLegs = [] }: { trip: SavedTrip; liveLegs?: LiveLeg[] }) {
  const fx = useFx();
  const route = trip.route;
  if (!route) return null;
  const month = trip.intent.startDate ? Number(trip.intent.startDate.slice(5, 7)) : trip.intent.month;
  const fare = flightSnapFor(route.gateway.airport, month);
  const rail = route.stops.slice(1).map((_, i) => legFareOf(route, i, liveLegs)).filter((f): f is LegFare => !!f);
  const railYen = rail.length ? { min: rail.reduce((a, f) => a + f.min, 0), max: rail.reduce((a, f) => a + f.max, 0) } : null;
  const nights = route.stops.reduce((a, s) => a + s.nights, 0);
  const days = nights + 1;
  const stayYen = STAY_YEN_NIGHT * nights;
  const foodYen = FOOD_YEN_DAY * days;
  const baht = (yen: number) => bahtOf(yen, fx!.rate);
  const money = (yen: number) => (fx ? `~฿${num(baht(yen))}` : `~¥${num(yen)}`);
  // the picture needs every part in one currency: baht once the rate is in
  const parts: { key: BudgetKey; baht: number }[] = fx
    ? [
        ...(fare ? [{ key: "flight" as const, baht: fare.snap.cheapest! }] : []),
        ...(railYen ? [{ key: "rail" as const, baht: baht((railYen.min + railYen.max) / 2) }] : []),
        { key: "stay" as const, baht: baht(stayYen) },
        { key: "food" as const, baht: baht(foodYen) },
      ]
    : [];
  const sum = parts.reduce((a, x) => a + x.baht, 0);
  // whole percentages that add up to 100: round down, then give the leftover points to the largest remainders
  const pcts = new Map<BudgetKey, number>(parts.map((x) => [x.key, Math.floor((x.baht / sum) * 100)]));
  [...parts].sort((a, b) => ((b.baht / sum) * 100) % 1 - ((a.baht / sum) * 100) % 1)
    .slice(0, parts.length ? 100 - [...pcts.values()].reduce((a, n) => a + n, 0) : 0)
    .forEach((x) => pcts.set(x.key, pcts.get(x.key)! + 1));
  const share = (key: BudgetKey) => pcts.get(key) ?? null;
  // the checked fare is a return ticket to the arrival airport; say so when the trip flies home from another one
  const openJaw = nearestGateway(route.stops[route.stops.length - 1]).g.airport !== route.gateway.airport;
  const biggest = parts.length ? parts.reduce((a, x) => (x.baht > a.baht ? x : a)) : null;
  const total = fx && fare ? sum : null;
  const inJapan = fx ? sum - (fare ? fare.snap.cheapest! : 0) : 0;
  const first = route.stops[0];
  const hotels = `https://www.google.com/travel/hotels?q=${encodeURIComponent(`hotels in ${first.city}${trip.intent.startDate ? ` ${trip.intent.startDate}` : ""}`)}`;
  const row = "flex items-baseline justify-between gap-3";
  const dot = (key: BudgetKey) => <span className="tabi-budget-dot" style={{ background: BUDGET_PART[key].color }} aria-hidden />;
  const pct = (key: BudgetKey) => { const n = share(key); return n === null ? null : <span className="tabi-muted ml-1 text-[11px] font-normal">{n}%</span>; };
  return (
    <section className="tabi-card p-4" aria-labelledby="tabi-budget-title">
      <h2 id="tabi-budget-title" className="mb-2 flex items-center gap-2 font-bold"><span aria-hidden>💰</span>งบคร่าว ๆ ต่อคน</h2>
      {parts.length > 1 && (
        <div className="tabi-budget-bar mb-3" role="img" aria-label={`สัดส่วนงบ ${parts.map((x) => `${BUDGET_PART[x.key].name} ${share(x.key)}%`).join(" ")}`}>
          {parts.map((x) => (
            <span key={x.key} style={{ flexGrow: x.baht, background: BUDGET_PART[x.key].color }}>
              {x.baht / sum >= 0.14 && <span aria-hidden>{BUDGET_PART[x.key].icon}</span>}
            </span>
          ))}
        </div>
      )}
      <ul className="space-y-2 text-sm">
        <li className={row}>
          <span>{dot("flight")}✈️ ตั๋วไป-กลับ{CITY_BY_NAME.get(route.gateway.city) ? ` ${CITY_BY_NAME.get(route.gateway.city)!.th}` : ""}{fare && !fare.exact ? ` (ตัวอย่าง ${MONTH_SHORT[Number(fare.snap.month.slice(5, 7))]})` : ""}</span>
          {fare ? <b className="whitespace-nowrap">~฿{num(fare.snap.cheapest!)}{pct("flight")}</b> : <span className="tabi-muted">ดูในหน้าตั๋ว</span>}
        </li>
        <li className={row}>
          <span>{dot("rail")}🚃 รถไฟระหว่างเมือง</span>
          {railYen ? <b className="whitespace-nowrap">{fx ? (baht(railYen.min) === baht(railYen.max) ? `~฿${num(baht(railYen.min))}` : `~฿${num(baht(railYen.min))}–${num(baht(railYen.max))}`) : `~${yenRange(railYen)}`}{pct("rail")}</b> : <span className="tabi-muted">{route.stops.length > 1 ? "ดูในปุ่มดูทาง" : "ไม่ต้องย้ายเมือง"}</span>}
        </li>
        <li className={row}>
          <span>{dot("stay")}🛏️ ที่พัก {nights} คืน <a href={hotels} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[var(--t-blue)] underline underline-offset-2">ดูราคาจริง ↗</a></span>
          <b className="whitespace-nowrap">{money(stayYen)}{pct("stay")}</b>
        </li>
        <li className={row}>
          <span>{dot("food")}🍜 อาหาร {days} วัน</span>
          <b className="whitespace-nowrap">{money(foodYen)}{pct("food")}</b>
        </li>
      </ul>
      {fx && (
        <div className="tabi-budget-sign mt-3">
          <Avatar size={52} mood={total ? "happy" : "idle"} animated={false} />
          <div className="min-w-0 flex-1">
            {total ? (
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-bold">รวมประมาณ</span>
                <ScratchReveal id={trip.id} hint="ขูดตรงนี้ ✨"><b className="text-xl text-[var(--t-blue)]">~฿{num(total)}</b></ScratchReveal>
              </p>
            ) : (
              <p className="text-sm font-bold">ยังไม่รวมตั๋วเครื่องบิน</p>
            )}
            <p className="mt-1 flex flex-wrap gap-1.5">
              <span className="tabi-budget-chip">📅 อยู่ญี่ปุ่นวันละ ~฿{num(Math.round(inJapan / days / 10) * 10)}</span>
              <span className="tabi-budget-chip">🍽️ แบ่ง 3 มื้อ ตกมื้อละ ~฿{num(bahtOf(FOOD_YEN_DAY / 3, fx.rate))}</span>
            </p>
            {biggest && parts.length > 1 && <p className="tabi-muted mt-1 text-xs">{BUDGET_PART[biggest.key].tip}</p>}
          </div>
        </div>
      )}
      <p className="tabi-muted mt-2 text-[11px] leading-snug">
        ตัวเลขประมาณทั้งหมด · ที่พักและอาหารใช้ค่าเฉลี่ยนักท่องเที่ยวต่างชาติ (สำนักงานการท่องเที่ยวญี่ปุ่น ม.ค.–มี.ค. 2025) · ไม่รวมค่าเข้าชมและรถไฟในเมือง
        {fare ? ` · ตั๋วเช็กเมื่อ ${thaiDate(isoDay(FLIGHTS_CHECKED_AT.slice(0, 10)))}` : ""}
        {fare && openJaw ? " · ราคาตั๋วคิดแบบไป-กลับสนามบินเดียว ทริปนี้บินกลับจากอีกสนามบิน ราคาจริงอาจต่าง" : ""}
        {fx ? ` · ¥1 = ฿${fx.rate.toFixed(3)}` : ""}
      </p>
    </section>
  );
}

const LEVEL_JA = { 30: "警報", 40: "危険警報", 50: "特別警報" } as const;
const LEVEL_TH = { 30: "เตือนภัย", 40: "อันตราย", 50: "อันตรายสูงสุด" } as const;

/** What each live event means for a traveller, in one line. */
function eventLine(e: SafetyEvent): { badge: string; level: 30 | 40 | 50; text: string } {
  if (e.kind === "quake") return { badge: `震度${e.shindo.replace(" บน", "強").replace(" ล่าง", "弱")}`, level: 40, text: `แผ่นดินไหวแรงระดับ ${e.shindo} ${e.prefsTh} ภายใน 24 ชม. ระวังอาฟเตอร์ช็อก รถไฟอาจหยุดตรวจราง` };
  if (e.kind === "tsunami") return { badge: e.level, level: e.level === "大津波警報" ? 50 : 40, text: `เตือนสึนามิ (${e.areaJa}) ถ้าอยู่ใกล้ทะเล ให้ขึ้นที่สูงทันที อย่ากลับไปชายฝั่งจนกว่าจะยกเลิกประกาศ` };
  return { badge: e.level, level: 30, text: `ภูเขาไฟ ${e.volcano} ใกล้${e.cityTh} ห้ามเข้าเขตปากปล่อง เส้นทางบางจุดอาจปิด` };
}

/** Live warnings for the route (JMA). Links straight to 気象庁, the pages people in Japan use. */
function HazardCard({ alerts, events }: { alerts: HazardAlert[]; events: SafetyEvent[] }) {
  return (
    <section role="alert" className="tabi-hazard tabi-pop">
      <p className="flex items-center gap-2 font-bold"><span aria-hidden>⚠️</span>ประกาศเตือนภัยจากกรมอุตุฯ ญี่ปุ่นตอนนี้</p>
      {alerts.length > 0 && <p className="mt-1 text-sm">รถไฟอาจหยุดหรือล่าช้า เช็กประกาศก่อนออกจากที่พักนะ</p>}
      <ul className="mt-2 space-y-2">
        {events.map((e, i) => {
          const l = eventLine(e);
          return (
            <li key={`e${i}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className={`tabi-hazard-level tabi-hazard-level--${l.level}`}>{l.badge}</span>
              <span>{l.text}</span>
              <a href={e.url} target="_blank" rel="noopener noreferrer" className="ml-auto font-semibold underline underline-offset-2">ดูประกาศ 気象庁 ↗</a>
            </li>
          );
        })}
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

/** Always on the trip: who to call, the alert app in Thai, the embassy — kept short (numbers first). */
function SafetyCard() {
  return (
    <section className="tabi-card p-4" aria-labelledby="tabi-safety-title">
      <h2 id="tabi-safety-title" className="flex items-center gap-2 font-bold"><span aria-hidden>🛟</span>ความปลอดภัย</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {EMERGENCY_TEL.map((t) => (
          <a key={t.number} href={`tel:${t.number}`} className="tabi-leg-link"><b>{t.number}</b>&nbsp;{t.label}</a>
        ))}
        <a href={`tel:${JNTO_HOTLINE.number.replace(/-/g, "")}`} className="tabi-leg-link">{JNTO_HOTLINE.label} {JNTO_HOTLINE.number}</a>
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer py-2 font-semibold text-[var(--t-blue)]">เบอร์สถานทูตไทย และแอปเตือนภัยภาษาไทย</summary>
        <ul className="space-y-1">
          {THAI_MISSION_TEL.map((t) => (
            <li key={t.number}><a href={`tel:${t.number.replace(/-/g, "")}`} className="inline-flex min-h-[36px] flex-wrap items-center gap-x-2"><b className="text-[var(--t-navy)]">{t.number}</b><span>{t.label}</span></a></li>
          ))}
          {SAFETY_LINKS.map((l) => (
            <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[36px] items-center underline underline-offset-2">{l.label} ↗</a></li>
          ))}
        </ul>
      </details>
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

/**
 * Trips live only on this device, so "send to my LINE" is how they move: the link carries the
 * whole trip (/t/<code>, nothing stored on a server) and opening it elsewhere offers "เก็บไว้".
 * Phones open the LINE app's share screen; desktops use LINE's share page.
 */
function LineSendButton({ trip }: { trip: SavedTrip }) {
  const [href, setHref] = useState<string | null>(null);
  useEffect(() => {
    const code = encodeShare(trip);
    if (!code) return setHref(null);
    const url = `${location.origin}/t/${code}`;
    const text = `ทริป ${trip.route?.stops.map((s) => s.cityTh).join(" → ") ?? trip.title} ${trip.itinerary?.length ?? ""} วัน (Nagame)`;
    const phone = window.matchMedia("(pointer: coarse)").matches;
    setHref(phone
      ? `https://line.me/R/share?text=${encodeURIComponent(`${text}
${url}`)}`
      : `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`);
  }, [trip]);
  if (!href) return null;
  return (
    <div className="-mt-3">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="tabi-btn w-full text-white"
        style={{ background: "#06C755" }}
        onClick={() => { const code = encodeShare(trip); track("trip_shared", { method: "line", ref: code ? shareRef(code) : "" }); earnOmamori("enmusubi"); }}
      >
        ส่งทริปเข้า LINE
      </a>
      <p className="tabi-muted mt-1 text-center text-xs">ส่งให้ตัวเองหรือเพื่อน แล้วเปิดลิงก์ในเครื่องอื่นเพื่อเก็บทริปไว้</p>
    </div>
  );
}

/** Map switches for stays / restaurants (off by default: the map stays about the route). */
function MapPinToggles({ cities, onPins }: { cities: string[]; onPins: (p: MapPin[]) => void }) {
  const [on, setOn] = useState<{ stay: boolean; eat: boolean }>({ stay: false, eat: false });
  const [all, setAll] = useState<MapPin[] | null>(null);
  const key = cities.join(",");
  useEffect(() => { setAll(null); setOn({ stay: false, eat: false }); }, [key]);
  useEffect(() => {
    if (!on.stay && !on.eat) return onPins([]);
    if (!all) {
      fetch(`/api/tabi/nearby?cities=${encodeURIComponent(key)}`)
        .then((r) => r.json())
        .then((b: { pins: { kind: "stay" | "eat"; name: string; lat: number; lon: number; url: string }[] }) =>
          setAll(b.pins.map((p) => ({ kind: p.kind, label: p.name, lat: p.lat, lon: p.lon, url: p.url }))))
        .catch(() => setAll([]));
      return;
    }
    onPins(all.filter((p) => on[p.kind]));
  }, [on, all, key, onPins]);
  const chip = (kind: "stay" | "eat", label: string) => (
    <button
      type="button"
      aria-pressed={on[kind]}
      className={`tabi-leg-link ${on[kind] ? "!bg-[var(--t-blue)] !text-white" : ""}`}
      onClick={() => setOn((o) => ({ ...o, [kind]: !o[kind] }))}
    >
      {label}
    </button>
  );
  const shown = all?.filter((p) => on[p.kind]).length ?? 0;
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5 px-1">
      <span className="tabi-muted text-xs">แสดงบนแผนที่:</span>
      {chip("stay", "🛏️ ที่พัก")}
      {chip("eat", "🍜 ร้านอาหาร")}
      {all && (on.stay || on.eat) && !shown && <span className="tabi-muted text-xs">ไกด์ยังไม่มีพิกัดในเมืองนี้</span>}
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

/**
 * Airports behind a flight code, in Thai. TYO/OSA/BKK are city codes (Google Flights searches every
 * airport of the city), which read like typos to most people, so the pass and pills name the airports.
 */
const BANGKOK_AIRPORTS = "สุวรรณภูมิ / ดอนเมือง";
const airportLabel = (code: string) => code === "BKK" ? BANGKOK_AIRPORTS : (AIRPORTS[code] ?? []).map((a) => a.th).join(" / ") || code;

/** Boarding-pass style leg (video reference): coloured header, big city names, search button. */
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
              <p className="tabi-title text-2xl font-bold leading-none">{leg.from}</p>
              <p className="tabi-muted mt-1 text-xs">{airportLabel(leg.fromCode)}</p>
            </div>
            <div className="tabi-pass-path" aria-hidden>
              <span className="tabi-pass-plane" style={{ color }}><Plane size={20} className={out ? "" : "-scale-x-100"} /></span>
            </div>
            <div className="text-right">
              <p className="tabi-title text-2xl font-bold leading-none">{leg.to}</p>
              <p className="tabi-muted mt-1 text-xs">{airportLabel(leg.toCode)}</p>
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

/** Bars of the checked round-trip fare, month by month, for one gateway: which month is cheap at a glance. */
function FlightMonthChart({ gateway, month }: { gateway: string; month?: number }) {
  const rows = flightMonths(gateway);
  if (rows.length < 3) return null;
  const max = Math.max(...rows.map((r) => r.cheapest!));
  const min = Math.min(...rows.map((r) => r.cheapest!));
  return (
    <section className="tabi-card p-4" aria-labelledby="tabi-month-chart-title">
      <h2 id="tabi-month-chart-title" className="mb-3 flex items-center gap-2 font-bold"><span aria-hidden>📊</span>ราคาตั๋วไป-กลับแต่ละเดือน</h2>
      <ol className="tabi-month-chart">
        {rows.map((r) => {
          const m = Number(r.month.slice(5, 7));
          const cheapest = r.cheapest === min;
          return (
            <li key={r.month} className={`${cheapest ? "is-cheapest" : ""} ${m === month ? "is-mine" : ""}`}>
              <span className="tabi-month-price">{num(r.cheapest!)}</span>
              <span className="tabi-month-track" aria-hidden><span className="tabi-month-bar" style={{ height: `${Math.round((r.cheapest! / max) * 100)}%` }}>{cheapest ? "🏷️" : ""}</span></span>
              <span className="tabi-month-name">{MONTH_SHORT[m]}</span>
              <span className="sr-only">{cheapest ? "ถูกสุด" : ""}{m === month ? " เดือนของทริปนี้" : ""}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <span><span className="tabi-budget-dot" style={{ background: "#ff5c9d" }} aria-hidden />ถูกสุด</span>
        {month && rows.some((r) => Number(r.month.slice(5, 7)) === month) && <span><span className="tabi-budget-dot" style={{ background: "#fff", boxShadow: "0 0 0 2px #0c1f4a" }} aria-hidden />เดือนของทริปนี้</span>}
      </p>
      <p className="tabi-muted mt-1 text-[11px] leading-snug">หน่วยบาท ต่อคน · ราคาตัวอย่างของวันที่ 10–15 ในแต่ละเดือน ทาบิเช็กใน Google Flights เมื่อ {thaiDate(isoDay(FLIGHTS_CHECKED_AT.slice(0, 10)))} · วันอื่นราคาต่างกันได้</p>
    </section>
  );
}

function FlightsScreen({ reply, trip, onPickDates, onBack, onChat, onPickDate }: {
  reply: TabiReply | null; trip: SavedTrip | null; onPickDates: (depart: string, days: number) => void;
  onBack: () => void; onChat: () => void; onPickDate: () => void;
}) {
  const link = reply?.flight;
  const gateway = trip?.route?.gateway.airport ?? link?.legs?.[0]?.toCode;
  const tripMonth = trip?.intent.startDate ? Number(trip.intent.startDate.slice(5, 7)) : trip?.intent.month ?? reply?.intent?.month;
  const dearest = reply?.dateOptions?.length ? Math.max(...reply.dateOptions.map((o) => o.price)) : 0;
  return (
    <div className="tabi-rise space-y-4">
      <TopBar onBack={onBack} />
      {trip?.route && (
        <section className="tabi-card tabi-flight-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img(trip.route.highlights[0]?.wikiTitle ?? trip.route.stops[0].city, trip.route.stops[0].city)} alt="" loading="lazy" onError={hideBroken} className="tabi-img" />
          <div className="min-w-0 flex-1">
            <p className="tabi-title font-bold leading-snug">{trip.title}</p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="tabi-hop-pill">🛬 บินเข้า {CITY_BY_NAME.get(trip.route.gateway.city)?.th ?? trip.route.gateway.city} ({airportLabel(trip.route.gateway.airport).replaceAll(" / ", "/")})</span>
              {trip.intent.startDate && <span className="tabi-hop-pill tabi-hop-fare">📅 {thaiDate(isoDay(trip.intent.startDate))}</span>}
            </p>
          </div>
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
                  {dearest > o.price && <span className="block text-xs font-semibold text-[var(--t-green-ink)]">ถูกกว่า ฿{num(dearest - o.price)}</span>}
                  <span className="tabi-price-bar" aria-hidden><span style={{ width: `${Math.round((o.price / dearest) * 100)}%`, background: i === 0 ? "#ff5c9d" : "#1a66d9" }} /></span>
                </span>
                <button type="button" className="tabi-btn tabi-btn--primary min-h-[40px] px-3 text-sm" onClick={() => onPickDates(o.depart, reply.dateOptionsDays ?? 5)}>เลือกช่วงนี้</button>
              </li>
            ))}
          </ul>
          <p className="tabi-muted text-[11px]">ราคาจาก Google Flights ที่ทาบิเช็กไว้ อาจเปลี่ยนตอนจองจริง{dearest ? " · “ถูกกว่า” เทียบกับช่วงที่แพงสุดในรายการนี้" : ""}</p>
        </section>
      ) : null}
      {gateway && <FlightMonthChart gateway={gateway} month={tripMonth} />}
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
          <Avatar size={96} mood="happy" />
          <p>ยังไม่มีทริปที่เก็บไว้ เริ่มคุยกับทาบิแล้วเลือกเส้นทาง ทริปจะถูกเก็บไว้ในเครื่องนี้อัตโนมัติ</p>
          <button type="button" className="tabi-btn tabi-btn--primary w-full" onClick={onNew}>เริ่มวางแผนทริป</button>
        </section>
      ) : (
        <ul className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {trips.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => onOpen(t)} className="tabi-card tabi-trip-card">
                <span className="tabi-trip-photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img(t.route?.highlights[0]?.wikiTitle ?? t.route?.stops[0]?.city ?? "Japan", t.route?.stops[0]?.city)} alt="" loading="lazy" onError={hideBroken} className="tabi-img" />
                  {t.intent.startDate && <span className="tabi-trip-count">{tripCountdown(t.intent.startDate)}</span>}
                </span>
                <span className="block min-w-0 p-3 pt-2.5">
                  <span className="flex items-start justify-between gap-2">
                    <span className="tabi-title block font-bold leading-snug">{t.title}</span>
                    <ArrowRight size={18} className="mt-0.5 shrink-0 text-[var(--t-blue)]" />
                  </span>
                  {t.route && (
                    <span className="tabi-trip-stops" aria-label={`เส้นทาง ${t.route.stops.map((s) => s.cityTh).join(" ไป ")}`}>
                      {t.route.stops.map((s, i) => (
                        <span key={s.city} aria-hidden><i style={{ background: DAY_COLORS[i % DAY_COLORS.length] }} />{s.cityTh}</span>
                      ))}
                    </span>
                  )}
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {t.route && <span className="tabi-hop-pill">🗓️ {t.route.stops.reduce((a, s) => a + s.nights, 0) + 1} วัน</span>}
                    {t.intent.startDate && <span className="tabi-hop-pill">✈️ {thaiDate(isoDay(t.intent.startDate))}</span>}
                    <span className={`tabi-hop-pill ${t.itinerary ? "tabi-hop-fare" : ""}`}>{t.itinerary ? "✅ มีแผนรายวันแล้ว" : "🧭 เลือกเส้นทางแล้ว"}</span>
                  </span>
                  <span className="tabi-muted mt-1.5 block text-[11px]">แก้ไขล่าสุด {new Date(t.updatedAt).toLocaleDateString("th-TH")}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <CollectionBook trips={trips} />
      <p className="tabi-muted text-xs">ทริปและของสะสมเก็บไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น ถ้าล้างข้อมูลเบราว์เซอร์ จะหายไปด้วย</p>
    </div>
  );
}

/* ── Collectibles: omamori shelf + manhole-cover book (lib/tabi/collect.ts) ── */
function useCollection(): Collection | null {
  const [c, setC] = useState<Collection | null>(null);
  useEffect(() => {
    const load = () => setC(readCollection());
    load();
    window.addEventListener(EARNED_EVENT, load);
    window.addEventListener("storage", load);
    return () => { window.removeEventListener(EARNED_EVENT, load); window.removeEventListener("storage", load); };
  }, []);
  return c;
}

type Detail = { kind: "omamori"; id: string } | { kind: "manhole"; id: string };

function CollectionBook({ trips }: { trips: SavedTrip[] }) {
  const c = useCollection();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [all, setAll] = useState(false);
  const { planned, here } = useMemo(() => tripCities(trips), [trips]);
  useEffect(() => { if (trips.some(travellingNow)) earnOmamori("shingan"); }, [trips]);
  if (!c) return null;
  const got = OMAMORI.filter((o) => c.omamori[o.id]).length;
  const stamped = MANHOLES.filter((m) => c.stamped[m.city]).length;
  const covers = [...MANHOLES].sort((a, b) => rank(a.city) - rank(b.city));
  function rank(city: string) { return c!.stamped[city] ? 0 : planned.has(city) ? 1 : 2; }
  const th = (city: string) => CITY_BY_NAME.get(city)?.th ?? city;
  return (
    <section id="tabi-collection" className="scroll-mt-24 space-y-4" aria-labelledby="tabi-collection-title">
      <h2 id="tabi-collection-title" className="flex flex-wrap items-baseline gap-x-3 text-xl font-bold">ของสะสม
        <span className="tabi-muted text-sm font-normal">เครื่องราง {got}/{OMAMORI.length} · ฝาท่อ {stamped}/{MANHOLES.length}</span>
      </h2>

      <div className="tabi-card tabi-shelf p-4">
        <h3 className="mb-1 font-bold">🎐 เครื่องราง (お守り)</h3>
        <p className="tabi-muted mb-3 text-xs">ได้เมื่อวางแผนทริปไปทีละขั้น กดดูได้ว่าแต่ละอันได้จากอะไร</p>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {OMAMORI.map((o) => {
            const have = !!c.omamori[o.id];
            return (
              <li key={o.id}>
                <button type="button" className={`tabi-charm ${have ? "" : "is-locked"}`} onClick={() => setDetail({ kind: "omamori", id: o.id })} aria-label={have ? `${o.th} ได้แล้ว` : `${o.th} ยังไม่ได้ ${o.how}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={omamoriImg(o.id)} alt="" width={400} height={560} loading="lazy" />
                  <span className="tabi-charm-name">{have ? o.th.replace("เครื่องราง", "") : "???"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="tabi-card p-4">
        <h3 className="mb-1 font-bold">🕳️ สมุดฝาท่อ (マンホール)</h3>
        <p className="tabi-muted mb-3 text-xs">ใส่เมืองในทริปแล้วฝาท่อจะเปิด พอถึงวันเที่ยวกด “มาถึงแล้ว” เพื่อปั๊มตรา · ลายวาดใหม่โดยทาบิ ไม่ใช่ลายจริงของเมือง</p>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {covers.filter((m, i) => all || c.stamped[m.city] || planned.has(m.city) || i < 12).map((m) => {
            const done = c.stamped[m.city], open = !!done || planned.has(m.city);
            return (
              <li key={m.city}>
                <button type="button" className={`tabi-cover ${open ? "" : "is-locked"} ${here.has(m.city) && !done ? "is-here" : ""}`} onClick={() => setDetail({ kind: "manhole", id: m.city })} aria-label={`ฝาท่อ${th(m.city)} ${done ? "ปั๊มแล้ว" : open ? "เปิดแล้ว ยังไม่ได้ไป" : "ยังไม่เปิด"}`}>
                  <span className="tabi-cover-img">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={manholeImg(m.city)} alt="" width={560} height={560} loading="lazy" />
                    {done && <span className="tabi-hanko" aria-hidden>มาแล้ว</span>}
                  </span>
                  <span className="tabi-cover-name">{th(m.city)}</span>
                  {here.has(m.city) && !done && <span className="tabi-cover-here">📍 ปั๊มได้</span>}
                </button>
              </li>
            );
          })}
        </ul>
        {covers.length > 12 && (
          <button type="button" className="tabi-btn tabi-btn--soft mt-3 w-full" aria-expanded={all} onClick={() => setAll((v) => !v)}>
            {all ? "ย่อสมุด" : `ดูฝาท่อทั้งหมด ${covers.length} เมือง`}
          </button>
        )}
      </div>
      {detail && <CollectDialog detail={detail} c={c} canStamp={detail.kind === "manhole" && here.has(detail.id)} open={detail.kind === "manhole" && (planned.has(detail.id) || !!c.stamped[detail.id])} onClose={() => setDetail(null)} />}
    </section>
  );
}

function CollectDialog({ detail, c, canStamp, open, onClose }: { detail: Detail; c: Collection; canStamp: boolean; open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  const o = detail.kind === "omamori" ? OMAMORI.find((x) => x.id === detail.id)! : null;
  const m = detail.kind === "manhole" ? MANHOLES.find((x) => x.city === detail.id)! : null;
  const have = o ? !!c.omamori[o.id] : !!c.stamped[detail.id];
  const th = m ? CITY_BY_NAME.get(m.city)?.th ?? m.city : "";
  return (
    <dialog ref={ref} className="tabi-collect-dialog" onClose={onClose} onClick={(e) => { if (e.target === e.currentTarget) ref.current?.close(); }}>
      <div className="p-5 text-center">
        <div className={`tabi-collect-big ${o ? "is-charm" : "is-cover"} ${(o ? have : open || have) ? "" : "is-locked"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={o ? omamoriImg(o.id) : manholeImg(m!.city)} alt={o ? o.th : `ฝาท่อ${th}`} />
          {m && have && <span className="tabi-hanko is-big" aria-hidden>มาแล้ว</span>}
        </div>
        {o ? (
          <>
            <p className="tabi-title mt-3 text-lg font-bold">{have ? o.th : "เครื่องรางที่ยังไม่ได้"}</p>
            <p className="text-sm text-[var(--t-pink-ink)]">{o.ja}</p>
            <p className="mt-2 text-sm">{have ? o.meaning : `ได้เมื่อ: ${o.how}`}</p>
            {have && <p className="tabi-muted mt-1 text-xs">ได้เมื่อ {thaiDate(isoDay(c.omamori[o.id]))}</p>}
          </>
        ) : (
          <>
            <p className="tabi-title mt-3 text-lg font-bold">ฝาท่อ{th}</p>
            <p className="text-sm text-[var(--t-pink-ink)]">{m!.ja}</p>
            <p className="mt-2 text-sm">
              {have ? `ปั๊มตราแล้วเมื่อ ${thaiDate(isoDay(c.stamped[m!.city]))}` : canStamp ? "อยู่ที่นี่แล้วใช่ไหม กดปั๊มตราเก็บไว้เลย" : open ? "เมืองนี้อยู่ในทริปแล้ว ถึงวันเที่ยวค่อยกลับมาปั๊มตรานะ" : `ใส่${th}ในทริปเพื่อเปิดฝาท่อนี้`}
            </p>
            {canStamp && !have && (
              <button type="button" className="tabi-btn tabi-btn--primary mt-3 w-full" onClick={() => stampManhole(m!.city)}>📍 มาถึงแล้ว ปั๊มเลย</button>
            )}
            <p className="tabi-muted mt-2 text-[11px]">ลายวาดใหม่โดยทาบิ ได้แรงบันดาลใจจากสิ่งที่มีชื่อของเมือง ไม่ใช่ลายฝาท่อจริง</p>
          </>
        )}
        <button type="button" className="tabi-btn tabi-btn--soft mt-4 w-full" onClick={() => ref.current?.close()}>ปิด</button>
      </div>
    </dialog>
  );
}

/** Home: the collection at a glance, so a first-time visitor knows it exists. */
function CollectTeaser({ onOpen }: { onOpen: () => void }) {
  const c = useCollection();
  const got = c ? OMAMORI.filter((o) => c.omamori[o.id]).length : 0;
  const stamped = c ? MANHOLES.filter((m) => c.stamped[m.city]).length : 0;
  return (
    <button type="button" onClick={onOpen} className="tabi-card tabi-teaser w-full text-left">
      <span className="tabi-teaser-charms" aria-hidden>
        {OMAMORI.slice(0, 3).map((o, i) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img key={o.id} src={omamoriImg(o.id)} alt="" width={400} height={560} className={c?.omamori[o.id] ? "" : "is-locked"} style={{ rotate: `${(i - 1) * 9}deg`, animationDelay: `${i * 220}ms` }} />
        ))}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={manholeImg("Kyoto")} alt="" width={560} height={560} className="tabi-teaser-cover" />
      </span>
      <span className="min-w-0 flex-1">
        <b className="tabi-title block">สะสมเครื่องรางและฝาท่อ</b>
        <span className="tabi-muted block text-sm">วางแผนทริปทีละขั้น ได้เครื่องรางทีละอัน ไปถึงเมืองจริงแล้วปั๊มตราฝาท่อ</span>
        <span className="mt-1.5 flex flex-wrap gap-1.5">
          <span className="tabi-hop-pill">🎐 {got}/{OMAMORI.length}</span>
          <span className="tabi-hop-pill">🕳️ {stamped}/{MANHOLES.length}</span>
        </span>
      </span>
      <ArrowRight size={18} className="shrink-0 text-[var(--t-blue)]" />
    </button>
  );
}

/** Day plan without a date: setting one earns the travel-safety charm. */
function DateCharmHint() {
  const c = useCollection();
  if (!c || c.omamori.ryoko) return null;
  const o = OMAMORI.find((x) => x.id === "ryoko")!;
  return (
    <p className="flex w-full items-center gap-2 rounded-2xl bg-[var(--t-sakura)] px-3 py-1.5 text-xs text-[var(--t-pink-ink)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={omamoriImg(o.id)} alt="" width={400} height={560} className="h-8 w-auto" />
      <span>ตั้งวันออกเดินทาง แล้วรับ<b>{o.th}</b></span>
    </p>
  );
}

const TRAVELLER_LEVELS = [
  { at: 0, name: "นักฝันเที่ยวญี่ปุ่น", icon: "💭" },
  { at: 3, name: "นักวางแผนตัวจริง", icon: "🗺️" },
  { at: 6, name: "นักเดินทางสายมู", icon: "🎐" },
  { at: 10, name: "นักสะสมฝาท่อ", icon: "🕳️" },
  { at: 20, name: "ปรมาจารย์ทาบิ", icon: "🏯" },
];

/** Profile: trips, charms and covers so far, and a playful level from the collection. */
function TravellerCard({ tripCount }: { tripCount: number }) {
  const c = useCollection();
  if (!c) return null;
  const got = OMAMORI.filter((o) => c.omamori[o.id]).length;
  const stamped = MANHOLES.filter((m) => c.stamped[m.city]).length;
  const score = got + stamped;
  const level = [...TRAVELLER_LEVELS].reverse().find((l) => score >= l.at)!;
  const next = TRAVELLER_LEVELS.find((l) => l.at > score);
  return (
    <section className="tabi-card tabi-traveller p-4" aria-label="สถิติการเดินทาง">
      <div className="flex items-center gap-3">
        <span className="tabi-traveller-badge" aria-hidden>{level.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="tabi-muted text-xs">ระดับนักเดินทาง</p>
          <p className="tabi-title text-lg font-bold">{level.name}</p>
          {next && (
            <>
              <span className="tabi-price-bar mt-1" aria-hidden><span style={{ width: `${Math.round(((score - level.at) / (next.at - level.at)) * 100)}%`, background: "#ff5c9d" }} /></span>
              <p className="tabi-muted mt-1 text-[11px]">อีก {next.at - score} ชิ้นถึง “{next.name}”</p>
            </>
          )}
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[["ทริป", tripCount, "🧳"], ["เครื่องราง", `${got}/${OMAMORI.length}`, "🎐"], ["ฝาท่อ", `${stamped}/${MANHOLES.length}`, "🕳️"]].map(([label, value, icon]) => (
          <div key={label} className="rounded-2xl bg-[var(--t-blue-soft)] px-2 py-2">
            <dd className="tabi-title text-lg font-bold"><span aria-hidden>{icon} </span>{value}</dd>
            <dt className="tabi-muted text-xs">{label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** "ได้เครื่องรางใหม่!" — the charm swings in at the bottom of the screen for a few seconds. */
function EarnToast({ onOpen }: { onOpen: () => void }) {
  const [shown, setShown] = useState<(Earned & { key: number }) | null>(null);
  useEffect(() => {
    const on = (e: Event) => setShown({ ...(e as CustomEvent<Earned>).detail, key: Date.now() });
    window.addEventListener(EARNED_EVENT, on);
    return () => window.removeEventListener(EARNED_EVENT, on);
  }, []);
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(null), 6000);
    return () => clearTimeout(t);
  }, [shown]);
  if (!shown) return null;
  const o = shown.kind === "omamori" ? OMAMORI.find((x) => x.id === shown.id) : null;
  const th = shown.kind === "manhole" ? CITY_BY_NAME.get(shown.id)?.th ?? shown.id : "";
  return (
    <div key={shown.key} className="tabi-earn" role="status">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={o ? omamoriImg(o.id) : manholeImg(shown.id)} alt="" className={o ? "tabi-earn-charm" : "tabi-earn-cover"} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-[var(--t-pink-ink)]">{o ? "ได้เครื่องรางใหม่!" : "ปั๊มตราฝาท่อแล้ว!"}</p>
        <p className="tabi-title font-bold leading-snug">{o ? o.th : `ฝาท่อ${th}`}</p>
        {o && <p className="tabi-muted text-xs">{o.meaning}</p>}
      </div>
      <button type="button" className="tabi-btn tabi-btn--soft min-h-[40px] shrink-0 px-3 text-sm" onClick={() => { setShown(null); onOpen(); }}>ดูของสะสม</button>
    </div>
  );
}

/** Profile: optional sign-in (LINE / Google) so trips follow the traveller across devices. */
function ProfileScreen({ me, tripCount, onSignOut, onDeleteAll }: {
  me: Me | null; tripCount: number; onSignOut: () => Promise<void>; onDeleteAll: () => Promise<{ ok: boolean; server: boolean }>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const privacy = (
    <details className="tabi-privacy">
      <summary>ข้อมูลของพี่เก็บยังไง</summary>
      <div className="tabi-muted mt-2 space-y-1 text-xs">
        <p>Nagame นับสถิติการใช้งานแบบไม่ระบุตัวตน เช่น จำนวนคนที่จัดแผนสำเร็จ เพื่อปรับปรุงทาบิ ไม่เก็บชื่อ อีเมล หรือข้อความที่พิมพ์</p>
        <p>คำถามทั่วไปที่ไม่เกี่ยวกับทริปจะส่งให้ AI ภายนอก (Typhoon) ช่วยตอบ อย่าพิมพ์ข้อมูลส่วนตัวในแชท</p>
      </div>
    </details>
  );
  return (
    <div className="tabi-rise space-y-4">
      <TopBar />
      <h1 className="text-2xl font-bold">โปรไฟล์</h1>
      <TravellerCard tripCount={tripCount} />
      {!me ? (
        <section className="tabi-card h-40 animate-pulse" />
      ) : !me.enabled ? (
        <section className="tabi-card space-y-2 p-5 text-center">
          <Avatar size={64} />
          <p className="font-bold">ยังไม่ต้องสมัครสมาชิก</p>
          <p className="tabi-muted text-sm">ทริปทั้งหมดเก็บไว้ในเครื่องนี้เท่านั้น Nagame ไม่เก็บทริปของพี่ไว้ที่ server จะย้ายไปเครื่องอื่น กด “ส่งทริปเข้า LINE” ในหน้าแผนรายวัน</p>
          {privacy}
        </section>
      ) : !me.user ? (
        <section className="tabi-card space-y-3 p-5">
          <div className="flex items-center gap-3">
            <Avatar size={56} mood="happy" />
            <p className="text-sm"><b className="text-[var(--t-pink-ink)]">แยกทริปของพี่ไว้ในบัญชี LINE</b><br />ใช้เครื่องร่วมกับคนอื่นได้โดยทริปไม่ปนกัน ไม่ต้องเข้าสู่ระบบก็ใช้ทาบิได้ครบเหมือนเดิม</p>
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
          <p className="tabi-muted text-xs">ทริปยังเก็บในเครื่องนี้เท่านั้น ชื่อกับรูปจาก LINE อยู่ในเครื่องนี้ ไม่ส่งไปเก็บที่ server และไม่ขออีเมลหรือเบอร์โทร</p>
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
            {me.sync ? `☁️ ทริปซิงก์อัตโนมัติแล้ว (${tripCount} ทริป)` : `ทริปเก็บในเครื่องนี้เท่านั้น (${tripCount} ทริป) จะย้ายเครื่อง กด “ส่งทริปเข้า LINE” ในหน้าแผนรายวัน`}
          </p>
          <button type="button" className="tabi-btn tabi-btn--soft w-full" onClick={() => void onSignOut()}>ออกจากระบบ</button>
          <p className="tabi-muted text-[11px]">{me.sync ? "ออกจากระบบแล้ว ทริปของบัญชีนี้จะถูกเอาออกจากเครื่องนี้ (ยังอยู่ในบัญชี)" : "ออกจากระบบแล้ว ทริปของบัญชีนี้จะซ่อนไว้ เข้าสู่ระบบด้วยบัญชีเดิมก็เห็นอีกครั้ง"}</p>
          {done ? <p role="status" className="text-sm text-[var(--t-green-ink)]">{done}</p> : (
            <button
              type="button"
              className={`tabi-btn w-full ${confirming ? "bg-[#b3261e] text-white" : "border border-[#f3c4c0] bg-white text-[#b3261e]"}`}
              onClick={async () => {
                if (!confirming) { setConfirming(true); return; }
                const r = await onDeleteAll();
                setDone(!r.ok ? "ลบไม่สำเร็จ ลองใหม่อีกครั้งนะ" : r.server ? "ลบทริปทั้งหมดแล้ว ทั้งในเครื่องนี้และออนไลน์" : "ลบทริปในเครื่องนี้แล้ว");
                if (r.ok) void signOut().catch(() => {});
              }}
            >
              {confirming ? (me.sync ? "กดอีกครั้งเพื่อยืนยัน: ลบทริปทั้งหมดทั้งในเครื่องและออนไลน์" : "กดอีกครั้งเพื่อยืนยัน: ลบทริปทั้งหมดในเครื่องนี้ กู้คืนไม่ได้") : "ลบข้อมูลทั้งหมด"}
            </button>
          )}
          {privacy}
        </section>
      )}
    </div>
  );
}
