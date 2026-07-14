"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Bot,
  Calendar,
  CloudRain,
  Compass,
  ExternalLink,
  Home,
  type LucideIcon,
  SearchCheck,
  ShieldAlert,
  Thermometer,
  Wind,
} from "lucide-react";
import { getKruakMood } from "@/lib/game/mood";
import { KruakAvatar } from "@/components/kruak-avatar";
import {
  countStamps,
  earnStamp,
  getCityStamps,
  STAMP_KEYS,
  STAMP_META,
  STAMPS_PER_CITY,
  type CityStamps,
  type StampKey,
} from "@/lib/game/journal";
import { CitySearch } from "@/components/city-search";
import type { Recommendation } from "@/lib/cities/city-configs";
import type { CityDrive } from "@/lib/cities/drive-spots";
import { formatMonthDay, japanHolidayWindows, windowStatus } from "@/lib/cities/holidays";
import type { CityTransit } from "@/lib/cities/transit";
import type { JapanCitySeed } from "@/lib/cities/japan-major-cities";
import type { DayPlanSignal } from "@/lib/services/day-plan";
import type { AqiSignal } from "@/lib/services/aqi";
import type { EventSignal } from "@/lib/services/events";
import type { FxSignal } from "@/lib/services/fx";
import type { QuakeSignal } from "@/lib/services/quakes";
import type { WarningSignal } from "@/lib/services/warnings";
import type { WebcamOption, WebcamSignal } from "@/lib/services/webcams";
import type { WeatherSignal } from "@/lib/services/weather";

const WebcamMap = dynamic(() => import("@/components/webcam-map").then((mod) => mod.WebcamMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-white/4 text-xs text-[#d2ccc3]">กำลังโหลดแผนที่...</div>
  ),
});

type DashboardProps = {
  city: {
    name: string;
    slug: string;
    japaneseName?: string;
    prefecture?: string;
    lat: number;
    lon: number;
  };
  cityMeta: {
    intro: string;
    mood: string;
    heroImage?: string;
  };
  weather: WeatherSignal;
  aqi: AqiSignal;
  webcam: WebcamSignal;
  events: EventSignal;
  quakes: QuakeSignal;
  fx: FxSignal;
  warnings: WarningSignal;
  verdict: string;
  transit: CityTransit | null;
  drive: CityDrive | null;
  recommendations: {
    see: RecommendationWithImage[];
    eat: RecommendationWithImage[];
    sleep: RecommendationWithImage[];
    shop: RecommendationWithImage[];
    do: RecommendationWithImage[];
  };
  seeds: JapanCitySeed[];
};

type RecommendationWithImage = Recommendation & {
  image?: string | null;
};

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

const quickPrompts = [
  "ฝนแบบนี้ไปไหนดี",
  "กินอะไรดีใกล้สถานี",
  "ควรพักย่านไหนดี",
  "ช่วยจัดแผนครึ่งวัน",
];

export function TravelDashboard({
  city,
  cityMeta,
  weather,
  aqi,
  webcam,
  warnings,
  verdict,
  recommendations,
  seeds,
}: DashboardProps) {
  const [chatInput, setChatInput] = useState("");
  // seed คำทักทายกร๊วกที่คำนวณฝั่ง server เป็นข้อความแรก — initializer อ่าน prop
  // ครั้งเดียว ค่าคงที่ระหว่าง server render กับ hydration (ไม่ recompute ฝั่ง client)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    { role: "assistant", content: verdict },
  ]);
  const [chatError, setChatError] = useState("");
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [selectedWebcamIndex, setSelectedWebcamIndex] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const severeWarnings = warnings.items.filter((item) => item.level !== "advisory");

  // ── เกม: 御朱印帳 สมุดตราประทับของกร๊วก (localStorage, per-เมือง) ──
  const [stamps, setStamps] = useState<CityStamps>({});
  const [journalOpen, setJournalOpen] = useState(false);
  const [slammingStamp, setSlammingStamp] = useState<StampKey | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const stampCount = countStamps(stamps);

  // NPC มู้ด — pure จากสัญญาณที่มีอยู่แล้ว ไม่ fetch ใหม่
  const mood = useMemo(
    () => getKruakMood({ hasSevereWarning: severeWarnings.length > 0, rainChance: weather.rainChance, aqi: aqi.aqi }),
    [severeWarnings.length, weather.rainChance, aqi.aqi],
  );

  // ประทับตรา: idempotent, ยิง animation เฉพาะครั้งที่ได้ใหม่, เช็คครบ 5/5 เพื่อคำชมของกร๊วก
  const claimStamp = useCallback(
    (key: StampKey) => {
      const { earned, stamps: next } = earnStamp(city.slug, key);
      if (!earned) return;
      setStamps(next);
      setSlammingStamp(key);
      window.setTimeout(() => setSlammingStamp((cur) => (cur === key ? null : cur)), 450);
      if (countStamps(next) === STAMPS_PER_CITY) {
        setJustCompleted(true);
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: "ครบทุกตราของเมืองนี้แล้ว! กร๊วกภูมิใจนะ 🎉 ไปเก็บเมืองอื่นต่อกันเลย" },
        ]);
      }
    },
    [city.slug],
  );

  // โหลดตราของเมืองนี้ + ประทับ "เยือนเมือง" อัตโนมัติเมื่อเปิดหน้า (ครั้งแรกของเมืองนั้น)
  useEffect(() => {
    const existing = getCityStamps(city.slug);
    setStamps(existing);
    setJustCompleted(false);
    if (!existing.visit) {
      const { stamps: next } = earnStamp(city.slug, "visit");
      setStamps(next);
    }
  }, [city.slug]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 900);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ประทับ "ดูแผนวันนี้" เมื่อ #day-plan โผล่เข้ามาในจอ
  const dayPlanRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const node = dayPlanRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          claimStamp("dayplan");
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [claimStamp]);

  // แผนวันนี้โหลดฝั่ง client — หน้าเพจไม่ต้องรอ AI ตอน server render
  const [dayPlan, setDayPlan] = useState<DayPlanSignal | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    setDayPlan(undefined);
    fetch(`/api/day-plan?slug=${encodeURIComponent(city.slug)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((plan: DayPlanSignal | null) => {
        if (!cancelled) setDayPlan(plan);
      })
      .catch(() => {
        if (!cancelled) setDayPlan(null);
      });
    return () => {
      cancelled = true;
    };
  }, [city.slug]);

  const holidayNotice = useMemo(() => {
    const statuses = japanHolidayWindows.map((window) => ({ window, status: windowStatus(window.from, window.to) }));
    return (
      statuses.find(({ status }) => status.state === "active") ??
      statuses.find(({ status }) => status.state === "upcoming" && status.daysUntil <= 14) ??
      null
    );
  }, []);
  const webcamOptions = webcam.options?.length
    ? webcam.options
    : [{ title: webcam.title ?? "Live camera", url: webcam.url, previewImage: webcam.previewImage, source: webcam.source }];
  const activeWebcam = webcamOptions[Math.min(selectedWebcamIndex, webcamOptions.length - 1)] ?? webcamOptions[0];
  const canEmbedWebcam = canEmbedInIframe(activeWebcam);

  const weatherTone = useMemo(() => {
    if ((weather.rainChance ?? 0) >= 70) return "ควรมีแผน indoor สำรอง";
    if ((weather.rainChance ?? 0) >= 40) return "มีสิทธิ์เจอฝนเป็นช่วง";
    return "จังหวะเที่ยวค่อนข้างคล่องตัว";
  }, [weather.rainChance]);

  function submitPrompt(prompt: string) {
    const value = prompt.trim();
    if (!value) return;

    setChatInput("");
    setChatError("");
    setChatMessages((prev) => [...prev, { role: "user", content: value }]);
    setIsPending(true);
    claimStamp("chat"); // ตรา 💬 — ทักกร๊วกแล้ว

    void (async () => {
      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // advisor ดึง signal ฝั่ง server เอง — ส่งแค่เมืองกับคำถามพอ
          body: JSON.stringify({ citySlug: city.slug, prompt: value }),
        });

        const data = (await response.json()) as { reply?: string; error?: string };
        if (!response.ok || !data.reply) {
          setChatError(data.error ?? "ตอบกลับไม่สำเร็จ ลองใหม่อีกครั้ง");
          return;
        }

        setChatMessages((prev) => [...prev, { role: "assistant", content: data.reply ?? "" }]);
      } catch {
        setChatError("การเชื่อมต่อ AI assistant ยังไม่สำเร็จ ลองใหม่อีกครั้ง");
      } finally {
        setIsPending(false);
      }
    })();
  }

  return (
    <main className="min-h-screen overflow-x-clip text-[var(--foreground)]">
      <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-8 px-4 pb-12 pt-4 md:px-8 md:pt-6 xl:px-10">
        <header className="z-40 nb-card px-4 py-4 md:sticky md:top-3 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <Link
                href="/"
                className="inline-block text-[11px] font-medium uppercase tracking-[0.28em] text-[var(--accent-warm)] transition hover:text-[var(--accent)]"
              >
                Nagame Travel Companion
              </Link>
              <div className="flex flex-wrap items-end gap-3">
                <h1 className="font-serif text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
                  {city.name}
                </h1>
                {city.japaneseName ? (
                  <p className="pb-1 font-serif text-xl text-[var(--accent-warm)] md:text-2xl">{city.japaneseName}</p>
                ) : null}
                {city.prefecture ? (
                  <span className="rounded-full border border-[var(--line)] bg-[rgba(239,232,221,0.65)] px-3 py-1 text-xs font-medium text-[var(--ink-muted)]">
                    {city.prefecture}, Japan
                  </span>
                ) : null}
              </div>
            </div>
            <nav className="flex flex-wrap gap-2 text-sm text-[var(--ink-muted)]">
              <Link
                href="/"
                className="nb-pill nb-pill-indigo inline-flex items-center gap-1.5 px-4 py-2"
              >
                <Home className="h-3.5 w-3.5" aria-hidden />
                ทุกเมือง
              </Link>
              <a href="#assistant" className="nb-pill nb-pill-gold px-4 py-2">ถามกร๊วก</a>
              <a href="#day-plan" className="nb-pill px-4 py-2 transition hover:bg-[var(--nb-gold)]/20">แผนวันนี้</a>
              <Link href={`/city/${city.slug}/around`} className="nb-pill px-4 py-2 transition hover:bg-[var(--nb-gold)]/20">รอบเมือง & เดินทาง</Link>
            </nav>
          </div>
          <div className="mt-4">
            <CitySearch seeds={seeds} defaultValue={city.name} />
          </div>
        </header>

        {severeWarnings.length ? (
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--nb-radius)] border-[2.5px] border-[var(--nb-ink)] bg-[var(--nb-vermilion-soft)] px-5 py-4 text-[#7a2418] shadow-[var(--nb-shadow-sm)]">
            <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden />
            <p className="text-sm font-medium leading-6">
              JMA ประกาศเตือนภัยในพื้นที่นี้:{" "}
              {severeWarnings.map((item) => item.label).join(" • ")}
              <span className="ml-2 font-normal text-[#a04f3f]">เช็กรายละเอียดที่การ์ดเตือนภัยด้านล่างก่อนวางแผนออกนอกที่พัก</span>
            </p>
          </div>
        ) : null}

        {holidayNotice ? (
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--nb-radius)] border-[2.5px] border-[var(--nb-ink)] bg-[var(--nb-gold)]/25 px-5 py-4 text-[#7a571a] shadow-[var(--nb-shadow-sm)]">
            <Calendar className="h-5 w-5 shrink-0" aria-hidden />
            <p className="text-sm font-medium leading-6">
              {holidayNotice.status.state === "active"
                ? `ตอนนี้อยู่ในช่วง ${holidayNotice.window.name} (${formatMonthDay(holidayNotice.window.from)} – ${formatMonthDay(holidayNotice.window.to)})`
                : `อีก ${holidayNotice.status.state === "upcoming" ? holidayNotice.status.daysUntil : ""} วันจะเข้าช่วง ${holidayNotice.window.name}`}
              <span className="ml-2 font-normal text-[#9c7a3a]">{holidayNotice.window.note}</span>
            </p>
          </div>
        ) : null}

        {/* ─── Tier 1 — พระเอก: คำตอบกร๊วก + แชท + อากาศเหลือบเดียว ─── */}
        <section id="overview" className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          {/* ซ้าย: คำทักทายกร๊วก (verdict) + กล่องแชท */}
          <section id="assistant" className="nb-card min-w-0 overflow-hidden">
            {/* แถบภาพเมืองบาง ๆ เป็นหัว ไม่ใช่ hero เต็มจอ */}
            <div className="relative h-36 overflow-hidden border-b-[2.5px] border-[var(--nb-ink)] md:h-44">
              {cityMeta.heroImage ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cityMeta.heroImage} alt={`${city.name}, Japan`} className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(27,28,30,0.10),rgba(31,36,48,0.55))]" />
                </>
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(180deg,#e7ded1,#d7dde3)]" />
              )}
              <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-3">
                <span className="nb-pill nb-pill-gold uppercase tracking-[0.14em]">{cityMeta.mood}</span>
                <div className="rounded-[12px] border-2 border-[var(--nb-ink)] bg-[var(--surface)] px-3 py-1.5 text-right">
                  <span className="font-serif text-2xl text-[var(--foreground)]">{weather.temperature ?? "--"}°</span>
                  <span className="ml-1.5 text-xs text-[var(--ink-muted)]">{weather.condition}</span>
                </div>
              </div>
            </div>

            <div className="p-5 md:p-6">
              {/* NPC nameplate สไตล์กล่องบทสนทนา RPG — avatar เปลี่ยนอารมณ์ตามข้อมูลจริง */}
              <div className="flex items-center gap-3">
                <KruakAvatar art={mood.art} />
                <div className="min-w-0">
                  <p className="font-serif text-lg leading-tight text-[var(--foreground)]">กร๊วก</p>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--accent-warm)]">
                    {mood.tone ?? "ผู้ช่วยเที่ยวประจำเมือง"}
                  </p>
                </div>
                {/* pill row เกม: กล้องสด + ตราประทับ 朱 x/5 (พื้นผิวเกมบนหน้า = แค่นี้) */}
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  {webcam.available && activeWebcam?.previewImage ? (
                    <button
                      type="button"
                      onClick={() => {
                        setWebcamOpen(true);
                        claimStamp("webcam");
                      }}
                      className="nb-pill transition hover:bg-[var(--nb-gold)]/30"
                    >
                      📷 กล้องสด
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setJournalOpen(true)}
                    className={`nb-pill transition hover:bg-[var(--nb-gold)]/30 ${slammingStamp ? "kruak-stamp-slam" : ""} ${stampCount === STAMPS_PER_CITY ? "nb-pill-gold" : ""}`}
                    aria-label={`สมุดตราประทับ ได้ ${stampCount} จาก ${STAMPS_PER_CITY} ตรา`}
                  >
                    朱 {stampCount}/{STAMPS_PER_CITY}
                  </button>
                </div>
              </div>

              {/* คำทักทายกร๊วก — speech bubble ตราประทับ (ข้อความแรกของแชท) + แชทต่อ */}
              <div className="mt-4 space-y-3">
                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {chatMessages.map((message, index) => (
                    <div key={`${message.role}-${index}`} className={index === 0 ? "space-y-2" : undefined}>
                      {/* ข้อความแรก (คำทักทายกร๊วก) แตกเป็นหลาย speech bubble ตาม \n\n —
                          ให้ความรู้สึก "กร๊วกพิมพ์มาทีละใบ" ไม่ใช่กำแพงข้อความก้อนเดียว.
                          ไม่แตะ chatMessages state (แตกตอน render เท่านั้น) = chat backend ไม่กระทบ */}
                      {index === 0 ? (
                        message.content
                          .split(/\n{2,}/)
                          .map((segment) => segment.trim())
                          .filter(Boolean)
                          .map((segment, segIndex) => (
                            <div
                              key={segIndex}
                              className="rounded-[16px] border-2 border-[var(--nb-ink)] bg-[var(--nb-vermilion-soft)] p-4 shadow-[3px_3px_0_0_var(--nb-ink)]"
                            >
                              <p className="whitespace-pre-line text-sm leading-7 text-[var(--foreground)]">{segment}</p>
                            </div>
                          ))
                      ) : (
                        <div
                          className={
                            message.role === "assistant"
                              ? "mr-6 rounded-[16px] border-2 border-[var(--nb-ink)] bg-[var(--surface-soft)] p-4"
                              : "ml-6 rounded-[16px] border-2 border-[var(--nb-ink)] bg-[var(--nb-indigo-soft)] p-4"
                          }
                        >
                          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                            {message.role === "assistant" ? <Bot className="h-3.5 w-3.5" aria-hidden /> : <Compass className="h-3.5 w-3.5" aria-hidden />}
                            {message.role === "assistant" ? "กร๊วก" : "คุณ"}
                          </div>
                          <p className="whitespace-pre-line text-sm leading-7 text-[var(--foreground)]">{message.content}</p>
                        </div>
                      )}

                      {/* delight: กร๊วกชะโงกดู webcam ให้ — bubble หลักฐานสด ต่อจากคำทักทาย
                          (เฉพาะข้อความแรก + มี webcam) แปลง data feed เป็นพฤติกรรมตัวละคร */}
                      {index === 0 && webcam.available && activeWebcam?.previewImage ? (
                        <button
                          type="button"
                          onClick={() => {
                            setWebcamOpen(true);
                            claimStamp("webcam"); // ตรา 📷 — ชะโงกดูเมืองแล้ว
                          }}
                          className="mt-3 block w-full overflow-hidden rounded-[16px] border-2 border-[var(--nb-ink)] bg-[var(--surface)] text-left shadow-[3px_3px_0_0_var(--nb-ink)] transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--nb-ink)]"
                        >
                          <div className="relative aspect-[16/9] overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={activeWebcam.previewImage} alt={activeWebcam.title ?? `${city.name} live`} className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(31,36,48,0.55))]" />
                            <span className="absolute left-3 top-3 nb-pill nb-pill-alert">● สดตอนนี้</span>
                          </div>
                          <p className="px-4 py-3 text-sm leading-6 text-[var(--foreground)]">
                            กร๊วกเพิ่งชะโงกดูให้ — นี่สภาพ {city.name} ตอนนี้เลย กดดูเต็ม ๆ ได้
                          </p>
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => submitPrompt(prompt)}
                      className="nb-pill transition hover:bg-[var(--nb-gold)]/30"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitPrompt(chatInput);
                  }}
                  className="space-y-3"
                >
                  <textarea
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    placeholder="ถามกร๊วก เช่น ถ้าฝน 70% ควรสลับไปย่านไหนก่อน"
                    maxLength={300}
                    rows={2}
                    className="nb-flat w-full px-4 py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--ink-muted)] focus:shadow-[3px_3px_0_0_var(--nb-ink)]"
                  />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {chatError ? <p className="text-sm font-medium text-[var(--nb-vermilion)]">{chatError}</p> : <span className="text-xs text-[var(--ink-muted)]">ตอบจากข้อมูลล่าสุดของหน้านี้</span>}
                    <button type="submit" disabled={isPending} className="nb-btn px-5 py-2.5 text-sm">
                      {isPending ? "กำลังคิด..." : "ถามกร๊วก"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </section>

          {/* ขวา: สภาพศาลเจ้าวันนี้ (metric = stat bar HUD) + เกริ่นเมือง */}
          <div className="grid min-w-0 content-start gap-4">
            <div className="nb-card p-5 md:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-warm)]">สภาพศาลเจ้าวันนี้ · {city.name}</p>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-muted)]">{cityMeta.intro}</p>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <MetricChip icon={Thermometer} label="รู้สึกเหมือน" value={formatValue(weather.feelsLike, "°C")} />
                <MetricChip icon={CloudRain} label="โอกาสฝน" value={formatValue(weather.rainChance, "%")} tone={(weather.rainChance ?? 0) >= 60 ? "alert" : undefined} />
                <MetricChip icon={Wind} label="ลม" value={formatValue(weather.windSpeed, " km/h")} />
                <MetricChip icon={ShieldAlert} label="ค่าฝุ่น AQI" value={typeof aqi.aqi === "number" ? `${aqi.aqi}` : aqi.label} tone={typeof aqi.aqi === "number" && aqi.aqi > 100 ? "alert" : "ok"} />
              </div>
              <p className="mt-3 text-xs leading-6 text-[var(--ink-muted)]">{weatherTone}</p>
            </div>
          </div>
        </section>

        {/* ─── Tier 2 — เควสต์วันนี้: แผนวันนี้ ─── */}
        <section id="day-plan" ref={dayPlanRef} className="nb-card p-5 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <SectionIntro
              eyebrow="เควสต์วันนี้ · today's quest"
              title="แผนวันนี้แบบจัดให้"
              description="จัดจากฝนรายช่วงเวลา ประกาศเตือน และจุดคัดมือของเมือง — อยากปรับแผน ถามกร๊วกด้านบนได้เลย"
            />
            <div className="nb-flat hidden shrink-0 p-3 text-[var(--nb-ink)] md:block">
              <SearchCheck className="h-5 w-5" aria-hidden />
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dayPlan === undefined ? (
              <div className="animate-pulse nb-flat px-4 py-6 text-center text-sm text-[var(--ink-muted)] md:col-span-2 xl:col-span-3">
                กำลังจัดแผนจากข้อมูลล่าสุด…
              </div>
            ) : dayPlan?.available ? (
              <>
                {dayPlan.context ? (
                  <p className="nb-flat px-4 py-3 text-sm leading-6 text-[var(--foreground)] md:col-span-2 xl:col-span-3">
                    {dayPlan.context}
                  </p>
                ) : null}
                {dayPlan.periods.map((period) => (
                  <div key={period.slot} className="nb-flat px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--nb-ink)]">{period.label}</p>
                      {typeof period.rainChance === "number" ? (
                        <span className={`nb-pill ${period.rainChance >= 60 ? "nb-pill-alert" : ""}`}>ฝน {period.rainChance}%</span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-sm font-medium leading-6 text-[var(--foreground)]">
                      {period.items.map((item) => item.title).join(" → ")}
                    </p>
                    {period.reason ? <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{period.reason}</p> : null}
                  </div>
                ))}
                {dayPlan.routeUrl ? (
                  <a
                    href={dayPlan.routeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="nb-btn flex items-center justify-center gap-2 px-4 py-3 text-sm md:col-span-2 xl:col-span-3"
                  >
                    เปิดเส้นทางทั้งวันใน Google Maps <ExternalLink className="h-4 w-4" aria-hidden />
                  </a>
                ) : null}
                <p className="px-1 text-xs text-[var(--ink-muted)] md:col-span-2 xl:col-span-3">
                  สูงสุด/ต่ำสุด {weather.high ?? "--"}° / {weather.low ?? "--"}° • ที่มา: {dayPlan.source}
                </p>
              </>
            ) : (
              <div className="nb-flat px-4 py-4 text-sm leading-7 text-[var(--ink-muted)] md:col-span-2 xl:col-span-3">
                {dayPlan?.message ?? "ยังจัดแผนไม่ได้ในตอนนี้ ลองรีเฟรชอีกครั้ง"}
              </div>
            )}
          </div>
        </section>


        {/* ─── Tier 3 — ของฝากจากกร๊วก (loot) + ประกาศจากศาลเจ้า (เตือนภัย) ─── */}
        <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <KruakPicksCard citySlug={city.slug} recommendations={recommendations} onClaim={() => claimStamp("recs")} />

          <PaperCard
            eyebrow="ประกาศจากศาลเจ้า · shrine notice"
            title="ประกาศเตือนภัยอากาศ"
            icon={ShieldAlert}
            description={`ประกาศเตือนภัย/เฝ้าระวังระดับภูมิภาครอบ ${city.name} จาก JMA อัปเดตทุก 10 นาที`}
          >
            <div className="mt-4 space-y-3">
              {warnings.available && warnings.items.length ? (
                <>
                  {warnings.items.map((item) => (
                    <div
                      key={item.code}
                      className="flex items-center justify-between gap-3 rounded-[22px] border border-[var(--line)] bg-[rgba(255,253,249,0.84)] px-4 py-3"
                    >
                      <p className="text-sm font-medium text-[var(--foreground)]">{item.label}</p>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${
                          item.level === "emergency"
                            ? "bg-[#9c3d31] text-white"
                            : item.level === "warning"
                              ? "bg-[#b9770e] text-white"
                              : "bg-[var(--surface-soft)] text-[var(--ink-muted)]"
                        }`}
                      >
                        {item.level === "emergency" ? "ขั้นวิกฤต" : item.level === "warning" ? "เตือนภัย" : "เฝ้าระวัง"}
                      </span>
                    </div>
                  ))}
                  {warnings.headline ? (
                    <p className="rounded-[22px] border border-dashed border-[var(--line-strong)] bg-[rgba(255,253,249,0.8)] px-4 py-3 text-xs leading-6 text-[var(--ink-muted)]">
                      ประกาศต้นฉบับ ({warnings.office ?? "JMA"}): {warnings.headline}
                    </p>
                  ) : null}
                </>
              ) : (
                <div className="rounded-[22px] border border-dashed border-[var(--line-strong)] bg-[rgba(255,253,249,0.8)] px-4 py-4 text-sm leading-7 text-[var(--ink-muted)]">
                  {warnings.available
                    ? `ไม่มีประกาศเตือนภัยอากาศใกล้ ${city.name} ในตอนนี้`
                    : warnings.message ?? "ยังเชื่อมต่อประกาศเตือนภัยไม่ได้ในตอนนี้"}
                </div>
              )}
              {warnings.reportedAt ? (
                <p className="px-1 text-xs text-[var(--ink-muted)]">ประกาศล่าสุด: {formatPublishedAt(warnings.reportedAt)}</p>
              ) : null}
            </div>
          </PaperCard>
        </section>
      </div>

      {showBackToTop ? (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="กลับขึ้นบนสุด"
          className="nb-btn fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center !bg-[var(--nb-indigo)] text-white"
        >
          <ArrowUp className="h-5 w-5" aria-hidden />
        </button>
      ) : null}

      {webcamOpen ? (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-[rgba(23,24,27,0.72)] backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex h-full w-full flex-col overflow-hidden border border-[rgba(255,248,240,0.14)] bg-[#20242b] text-[#f8f3eb] shadow-[0_30px_110px_rgba(20,22,25,0.56)] sm:h-auto sm:max-h-[94vh] sm:max-w-5xl sm:rounded-[30px]">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/8 px-4 py-3 sm:px-5 sm:py-4">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#cda47f]">Live webcam viewer</p>
                <h3 className="mt-1 truncate font-serif text-lg sm:text-2xl">{activeWebcam?.title ?? `ดูบรรยากาศ ${city.name}`}</h3>
              </div>
              <button
                type="button"
                onClick={() => setWebcamOpen(false)}
                className="shrink-0 rounded-full border border-white/12 px-4 py-2 text-sm text-[#f4ede6] transition hover:bg-white/8"
              >
                ปิด
              </button>
            </div>
            <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] lg:overflow-y-visible">
              <div className="shrink-0 bg-[#111317]">
                {activeWebcam?.url && canEmbedWebcam ? (
                  <iframe
                    key={activeWebcam.url}
                    src={activeWebcam.url}
                    title={activeWebcam.title ?? "Live webcam"}
                    className="h-[38vh] min-h-[220px] w-full sm:h-[48vh] lg:h-[60vh] lg:min-h-[320px]"
                    allow="autoplay; fullscreen"
                  />
                ) : activeWebcam?.previewImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeWebcam.previewImage} alt={activeWebcam.title ?? "Webcam preview"} className="h-[38vh] min-h-[220px] w-full object-cover sm:h-[48vh] lg:h-[60vh] lg:min-h-[320px]" />
                ) : (
                  <div className="flex h-[38vh] min-h-[220px] items-center justify-center px-6 text-center text-sm text-[#d2ccc3] sm:h-[48vh] lg:h-[60vh] lg:min-h-[320px]">
                    ยังไม่มีภาพ webcam พร้อมใช้งานในตอนนี้
                  </div>
                )}
              </div>
              <div className="space-y-4 p-4 sm:p-5 lg:max-h-[60vh] lg:overflow-y-auto">
                {webcamOptions.some((option) => typeof option.lat === "number") ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#cda47f]">เลือกจากแผนที่</p>
                    <div className="h-44 overflow-hidden rounded-[18px] border border-white/10 sm:h-52">
                      <WebcamMap
                        options={webcamOptions}
                        selectedIndex={selectedWebcamIndex}
                        onSelect={setSelectedWebcamIndex}
                        cityLat={city.lat}
                        cityLon={city.lon}
                      />
                    </div>
                  </div>
                ) : null}

                {webcamOptions.length > 1 ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#cda47f]">เลือกวิวอื่น</p>
                    <div className="grid gap-2 pr-1 lg:max-h-[26vh] lg:overflow-y-auto">
                      {webcamOptions.map((option, index) => (
                        <button
                          key={`${option.title}-${index}`}
                          type="button"
                          onClick={() => setSelectedWebcamIndex(index)}
                          className={`flex items-center gap-3 rounded-[18px] border p-2 text-left transition ${
                            index === selectedWebcamIndex
                              ? "border-[#cda47f] bg-white/8"
                              : "border-white/10 hover:border-white/25"
                          }`}
                        >
                          {option.previewImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={option.previewImage} alt={option.title} className="h-12 w-20 shrink-0 rounded-[12px] object-cover" />
                          ) : (
                            <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-[12px] bg-white/8 text-[10px] text-[#d2ccc3]">
                              view {index + 1}
                            </div>
                          )}
                          <span className="line-clamp-2 text-xs leading-5 text-[#e6ddd1]">{option.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-[22px] border border-white/10 bg-white/4 p-4 text-sm leading-7 text-[#e6ddd1]">
                  <p>Source: {activeWebcam?.source ?? webcam.source}</p>
                  <p>เมือง: {city.name}</p>
                </div>
                {activeWebcam?.url ? (
                  <a
                    href={activeWebcam.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[#efe2d0] px-4 py-3 text-sm font-medium text-[#232830]"
                  >
                    เปิดต้นทาง <ExternalLink className="h-4 w-4" aria-hidden />
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {journalOpen ? (
        <KruakJournalModal
          cityName={city.name}
          stamps={stamps}
          justCompleted={justCompleted}
          onClose={() => setJournalOpen(false)}
        />
      ) : null}
    </main>
  );
}

// การ์ด "ของฝากจากกร๊วก" (loot drop) — โชว์ 1 อันต่อหมวด (พัก/กิน/เที่ยว) เท่านั้น.
// กฎกันหลุดเป็น dashboard: หน้าหลักโชว์ index 0 ของแต่ละหมวด อยากได้มากกว่านั้น = ไป /around.
function KruakPicksCard({
  citySlug,
  recommendations,
  onClaim,
}: {
  citySlug: string;
  recommendations: DashboardProps["recommendations"];
  onClaim: () => void;
}) {
  const picks = [
    { emoji: "🛏", label: "พัก", item: recommendations.sleep[0] },
    { emoji: "🍜", label: "กิน", item: recommendations.eat[0] },
    { emoji: "⛩", label: "เที่ยว", item: recommendations.see[0] },
  ].filter((pick) => pick.item);

  return (
    <div className="nb-card p-5 md:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-warm)]">ของฝากจากกร๊วกวันนี้ · today&apos;s drop</p>
      <h3 className="mt-2 font-serif text-2xl text-[var(--foreground)]">กร๊วกเลือกให้ที่นึง</h3>
      <p className="mt-3 text-sm leading-7 text-[var(--ink-muted)]">คัดมาหมวดละหนึ่งจากที่กร๊วกชอบ — อยากดูครบทุกที่ กดปุ่มด้านล่างไปหน้ารอบเมือง</p>

      <div className="mt-4 space-y-2.5">
        {picks.map((pick) => (
          <div key={pick.label} className="flex items-start gap-3 rounded-[14px] border-2 border-[var(--nb-ink)] bg-[var(--surface-soft)] px-3.5 py-3">
            <span className="text-xl leading-none" aria-hidden>{pick.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-warm)]">{pick.label}</p>
              <p className="truncate text-sm font-semibold text-[var(--foreground)]">{pick.item!.title}</p>
              {pick.item!.note ? <p className="truncate text-xs leading-5 text-[var(--ink-muted)]">{pick.item!.note}</p> : null}
            </div>
            {pick.item!.area ? (
              <Link
                href={`/city/${citySlug}?tab=map&area=${encodeURIComponent(pick.item!.area)}`}
                scroll={false}
                className="nb-pill shrink-0 self-center px-2.5 py-1.5 text-[11px]"
                title={`ดู ${pick.item!.area} บนแผนที่`}
              >
                📍 แผนที่
              </Link>
            ) : null}
          </div>
        ))}
      </div>

      <Link
        href={`/city/${citySlug}/around`}
        onClick={onClaim}
        className="mt-4 flex items-center justify-between gap-3 rounded-[var(--nb-radius-sm)] border-[2.5px] border-[var(--nb-ink)] bg-[var(--nb-indigo)] p-4 text-white shadow-[var(--nb-shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--nb-shadow)]"
      >
        <div>
          <p className="text-sm font-semibold">ดูที่พัก / ที่กิน / ที่เที่ยวทั้งหมด</p>
          <p className="mt-1 text-xs text-white/70">รับตรา 🍜 + จุดคัดมือทั้งเมืองที่หน้ารอบเมือง</p>
        </div>
        <Compass className="h-5 w-5 shrink-0" aria-hidden />
      </Link>
    </div>
  );
}

// สมุด 御朱印帳 — เปิดจาก pill 朱 เท่านั้น (ไม่ render บนหน้า). โชว์ 5 ช่องตรา: ได้=ประทับสีชาด, ยังไม่ได้=เส้นจาง
function KruakJournalModal({
  cityName,
  stamps,
  justCompleted,
  onClose,
}: {
  cityName: string;
  stamps: CityStamps;
  justCompleted: boolean;
  onClose: () => void;
}) {
  const earned = countStamps(stamps);
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-[rgba(23,24,27,0.72)] backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex h-full w-full flex-col overflow-hidden bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--nb-shadow)] sm:h-auto sm:max-h-[92vh] sm:max-w-md sm:rounded-[var(--nb-radius)] sm:border-[2.5px] sm:border-[var(--nb-ink)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b-[2.5px] border-[var(--nb-ink)] px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-warm)]">御朱印帳 · สมุดตราประทับ</p>
            <h3 className="mt-1 font-serif text-xl text-[var(--foreground)]">{cityName} · {earned}/{STAMPS_PER_CITY}</h3>
          </div>
          <button type="button" onClick={onClose} className="nb-pill shrink-0 px-4 py-2">ปิด</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {justCompleted ? (
            <p className="mb-4 rounded-[14px] border-2 border-[var(--nb-ink)] bg-[var(--nb-gold)]/30 px-4 py-3 text-center text-sm font-semibold text-[var(--foreground)]">
              🎉 ครบทุกตราของ {cityName} แล้ว! กร๊วกภูมิใจนะ
            </p>
          ) : (
            <p className="mb-4 text-sm leading-6 text-[var(--ink-muted)]">เก็บตราครบทั้ง {STAMPS_PER_CITY} ดวงของเมืองนี้ — ตราได้จากการเที่ยวไปกับกร๊วกในแอป</p>
          )}
          <div className="grid grid-cols-1 gap-3">
            {STAMP_KEYS.map((key) => {
              const has = Boolean(stamps[key]);
              const meta = STAMP_META[key];
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 rounded-[14px] border-2 px-4 py-3 transition ${
                    has
                      ? "border-[var(--nb-ink)] bg-[var(--nb-vermilion-soft)]"
                      : "border-dashed border-[var(--line-strong)] bg-transparent opacity-70"
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-xl ${
                      has ? "border-[var(--nb-vermilion)] bg-[var(--surface)]" : "border-[var(--line-strong)] grayscale"
                    }`}
                    aria-hidden
                  >
                    {has ? meta.emoji : "○"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{meta.label}</p>
                    <p className="text-xs leading-5 text-[var(--ink-muted)]">{has ? "ได้แล้ว ✓" : meta.hint}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function PaperCard({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="nb-card p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-warm)]">{eyebrow}</p>
          <h3 className="mt-2 font-serif text-2xl text-[var(--foreground)]">{title}</h3>
          <p className="mt-3 text-sm leading-7 text-[var(--ink-muted)]">{description}</p>
        </div>
        <div className="nb-flat shrink-0 p-3 text-[var(--nb-ink)]">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
      {children}
    </div>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--accent-warm)]">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-3xl text-[var(--foreground)]">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-muted)]">{description}</p>
    </div>
  );
}

// อากาศเหลือบเดียวใน hero — chip ขอบหมึกหนา ตราประทับ (แทน MetricCard พื้นโปร่งของ hero เดิม)
function MetricChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Thermometer;
  label: string;
  value: string;
  tone?: "alert" | "ok";
}) {
  const toneClass = tone === "alert" ? "bg-[var(--nb-vermilion-soft)]" : tone === "ok" ? "bg-[var(--nb-matcha-soft)]" : "bg-[var(--surface-soft)]";
  return (
    <div className={`rounded-[12px] border-2 border-[var(--nb-ink)] px-3 py-2.5 ${toneClass}`}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--ink-muted)]">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        <span>{label}</span>
      </div>
      <p className="mt-1.5 font-serif text-2xl text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function formatValue(value: number | null, suffix: string) {
  return typeof value === "number" ? `${value}${suffix}` : "--";
}

function formatPublishedAt(value: string) {
  try {
    return new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function canEmbedInIframe(webcam: WebcamOption) {
  if (!webcam.url) return false;

  // Windy embed player ออกแบบมาให้ฝัง iframe ได้ (ไม่ส่ง X-Frame-Options)
  if (/webcams\.windy\.com\/.*\/embed\//i.test(webcam.url)) return true;

  return !/windy|webcams\.travel|kbc\.co\.jp/i.test(`${webcam.source} ${webcam.url}`);
}
