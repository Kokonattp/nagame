"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  Activity,
  Banknote,
  Bot,
  CloudRain,
  Compass,
  ExternalLink,
  Gift,
  Home,
  MapPin,
  MessagesSquare,
  Mountain,
  SearchCheck,
  ShieldAlert,
  Sparkles,
  Thermometer,
  Tv,
  UtensilsCrossed,
  Waves,
  Wind,
} from "lucide-react";
import { CitySearch } from "@/components/city-search";
import type { Recommendation } from "@/lib/cities/city-configs";
import type { JapanCitySeed } from "@/lib/cities/japan-major-cities";
import type { SummarySignal } from "@/lib/services/ai-summary";
import type { AqiSignal } from "@/lib/services/aqi";
import type { EventSignal } from "@/lib/services/events";
import type { FxSignal } from "@/lib/services/fx";
import type { QuakeSignal } from "@/lib/services/quakes";
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
  summary: SummarySignal;
  nearbyCities: {
    slug: string;
    name: string;
    prefecture: string;
    japaneseName: string;
    distanceKm: number;
    intro: string;
    mood: string;
    heroImage?: string;
  }[];
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
  events,
  quakes,
  fx,
  summary,
  nearbyCities,
  recommendations,
  seeds,
}: DashboardProps) {
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `พร้อมช่วยวางแผนเที่ยว ${city.name} แบบสงบ ใช้ง่าย และอิงข้อมูลของหน้าปัจจุบันครับ`,
    },
  ]);
  const [chatError, setChatError] = useState("");
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [selectedWebcamIndex, setSelectedWebcamIndex] = useState(0);
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

    void (async () => {
      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cityName: city.name,
            prefecture: city.prefecture,
            prompt: value,
            weather: {
              condition: weather.condition,
              temperature: weather.temperature,
              rainChance: weather.rainChance,
            },
            aqi: {
              label: aqi.label,
              aqi: aqi.aqi,
            },
            events: events.items.map((item) => ({
              title: item.title,
              publishedAt: item.publishedAt,
            })),
            recommendations,
          }),
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
        <header className="z-40 rounded-[30px] border border-[var(--line)] bg-[rgba(255,251,245,0.84)] px-4 py-4 shadow-[0_14px_48px_rgba(31,36,48,0.06)] backdrop-blur-xl md:sticky md:top-3 md:px-6">
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
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--accent)] px-4 py-2 text-[#faf7f2] transition hover:bg-[#1b2a39]"
              >
                <Home className="h-3.5 w-3.5" aria-hidden />
                ทุกเมือง
              </Link>
              <a href="#overview" className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.72)] px-4 py-2 hover:border-[var(--line-strong)]">วันนี้</a>
              <a href="#nearby" className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.72)] px-4 py-2 hover:border-[var(--line-strong)]">เมืองใกล้เคียง</a>
              <a href="#ideas" className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.72)] px-4 py-2 hover:border-[var(--line-strong)]">ไอเดียทริป</a>
              <a href="#assistant" className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.72)] px-4 py-2 hover:border-[var(--line-strong)]">AI Insight</a>
            </nav>
          </div>
          <div className="mt-4">
            <CitySearch seeds={seeds} defaultValue={city.name} />
          </div>
        </header>

        <section id="overview" className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.95fr)]">
          <div className="min-w-0 overflow-hidden rounded-[36px] border border-[var(--line)] bg-[var(--surface-strong)] shadow-[0_24px_80px_rgba(31,36,48,0.07)]">
            <div className="relative min-h-[560px]">
              {cityMeta.heroImage ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cityMeta.heroImage} alt={`${city.name}, Japan`} className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(27,28,30,0.18),rgba(31,36,48,0.62))]" />
                </>
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(180deg,#e7ded1,#d7dde3)]" />
              )}

              <div className="relative flex h-full flex-col justify-between p-6 md:p-8">
                <div className="flex flex-col gap-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <span className="inline-flex rounded-full border border-white/25 bg-white/12 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-white/86">
                      {cityMeta.mood}
                    </span>
                    <div className="ml-auto max-w-full rounded-[22px] border border-white/15 bg-[rgba(255,255,255,0.10)] px-4 py-3 text-right text-white backdrop-blur-md md:rounded-[28px] md:px-5 md:py-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/68 md:text-[11px] md:tracking-[0.24em]">Latest weather</p>
                      <p className="mt-1 font-serif text-4xl md:mt-2 md:text-6xl">{weather.temperature ?? "--"}°</p>
                      <p className="mt-1 text-sm text-white/80">{weather.condition}</p>
                    </div>
                  </div>

                  <div className="max-w-3xl space-y-4 text-white">
                    <h2 className="font-serif text-4xl leading-tight md:text-6xl">
                      เที่ยว {city.name}
                      <br />
                      แบบสงบ ใช้ง่าย และพอดีกับวันจริง
                    </h2>
                    <p className="max-w-2xl text-sm leading-7 text-white/82 md:text-base">
                      {cityMeta.intro}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MetricCard icon={Thermometer} label="Feels like" value={formatValue(weather.feelsLike, "°C")} detail={weatherTone} />
                  <MetricCard icon={CloudRain} label="Rain chance" value={formatValue(weather.rainChance, "%")} detail="ใช้เลือกทางเดินเมืองหรือแผนหลบฝน" />
                  <MetricCard icon={Wind} label="Wind" value={formatValue(weather.windSpeed, " km/h")} detail="ช่วยตัดสินใจจุดวิว ริมน้ำ และ rooftop" />
                  <MetricCard icon={ShieldAlert} label="AQI" value={typeof aqi.aqi === "number" ? `${aqi.aqi}` : aqi.label} detail={`อากาศ ${aqi.label}`} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-6">
            <PaperCard
              eyebrow="Live webcam"
              title={activeWebcam?.title ?? `ดูบรรยากาศ ${city.name}`}
              icon={Tv}
              description={
                webcam.available
                  ? "เช็กท้องฟ้า ความหนาแน่นของคน และสภาพหน้างานจากในแอปก่อนออกเที่ยว"
                  : webcam.message ?? "ตอนนี้ยังไม่พบ webcam ที่ใช้งานได้"
              }
            >
              <button
                type="button"
                onClick={() => setWebcamOpen(true)}
                className="mt-4 block w-full overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface-soft)] text-left transition hover:border-[var(--line-strong)]"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  {activeWebcam?.previewImage ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={activeWebcam.previewImage} alt={activeWebcam.title ?? "Webcam preview"} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(31,36,48,0.48))]" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,#e9e2d8,#d7dde3)]" />
                  )}
                  <div className="absolute inset-x-4 bottom-4 rounded-[22px] bg-[rgba(255,252,247,0.88)] px-4 py-3 backdrop-blur">
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--accent-warm)]">In-app viewer</p>
                    <p className="mt-1 text-sm font-medium text-[var(--foreground)]">กดเพื่อดู webcam ในแอป</p>
                  </div>
                </div>
              </button>

              {webcamOptions.length > 1 ? (
                <div className="mt-3 flex w-0 min-w-full gap-2 overflow-x-auto pb-1">
                  {webcamOptions.map((option, index) => (
                    <button
                      key={`${option.title}-${index}`}
                      type="button"
                      onClick={() => setSelectedWebcamIndex(index)}
                      title={option.title}
                      className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-[14px] border-2 transition ${
                        index === selectedWebcamIndex
                          ? "border-[var(--accent)]"
                          : "border-transparent opacity-75 hover:opacity-100"
                      }`}
                    >
                      {option.previewImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={option.previewImage} alt={option.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,#e9e2d8,#d7dde3)] text-[10px] text-[var(--ink-muted)]">
                          view {index + 1}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : null}
            </PaperCard>

            <PaperCard
              eyebrow="Travel signals"
              title="สรุปสั้นสำหรับใช้หน้างาน"
              icon={SearchCheck}
              description="อ่านแล้วตัดสินใจได้ทันทีว่าควรเดินต่อ หลบฝน หรือปรับจังหวะวัน"
            >
              <div className="mt-4 space-y-3">
                <p className="rounded-[22px] border border-[var(--line)] bg-[rgba(255,253,249,0.84)] px-4 py-3 text-sm leading-7 text-[var(--foreground)]">
                  {summary.text}
                </p>
                <SignalRow label="สูงสุด / ต่ำสุด" value={`${weather.high ?? "--"}° / ${weather.low ?? "--"}°`} note="ดูช่วงกลางวันเทียบกับเย็น" />
                <p className="px-1 text-xs text-[var(--ink-muted)]">ที่มา: {summary.source}</p>
              </div>
            </PaperCard>
          </div>
        </section>

        <section id="nearby" className="rounded-[36px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_18px_70px_rgba(31,36,48,0.05)] md:p-7">
          <SectionIntro
            eyebrow="Nearby cities"
            title={`ไปไหนดีใกล้ ${city.name}`}
            description="เผื่อคุณอยากขยับเป็น day trip หรือเปลี่ยนบรรยากาศโดยยังเดินทางต่อได้จริง"
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {nearbyCities.map((nearby) => (
              <Link
                key={nearby.slug}
                href={`/city/${nearby.slug}`}
                className="group overflow-hidden rounded-[30px] border border-[var(--line)] bg-[rgba(255,253,249,0.92)] transition hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:shadow-[0_20px_60px_rgba(31,36,48,0.08)]"
              >
                <div className="relative h-44 overflow-hidden bg-[linear-gradient(180deg,#e7ded1,#d7dde3)]">
                  {nearby.heroImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={nearby.heroImage} alt={nearby.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                  ) : null}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(31,36,48,0.35))]" />
                  <div className="absolute left-4 top-4 rounded-full border border-white/30 bg-[rgba(255,250,244,0.78)] px-3 py-1 text-xs font-medium text-[var(--accent)] backdrop-blur">
                    ประมาณ {nearby.distanceKm} กม.
                  </div>
                </div>
                <div className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-serif text-2xl text-[var(--foreground)]">{nearby.name}</h3>
                      <p className="text-sm text-[var(--accent-warm)]">{nearby.japaneseName}</p>
                    </div>
                    <span className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-[11px] font-medium text-[var(--ink-muted)]">
                      {nearby.mood}
                    </span>
                  </div>
                  <p className="text-sm leading-7 text-[var(--ink-muted)]">{nearby.intro}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="ideas" className="grid gap-6 xl:grid-cols-3">
          <IdeaColumn title="ไปไหนดี" eyebrow="Where to go" icon={Compass} items={recommendations.see} cityName={city.name} />
          <IdeaColumn title="กินอะไรดี" eyebrow="What to eat" icon={UtensilsCrossed} items={recommendations.eat} cityName={city.name} />
          <IdeaColumn title="นอนไหนดี" eyebrow="Where to stay" icon={Mountain} items={recommendations.sleep} cityName={city.name} />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <IdeaColumn title="ของฝาก & คาเฟ่" eyebrow="Souvenirs & cafes" icon={Gift} items={recommendations.shop} cityName={city.name} />
          <IdeaColumn title="กิจกรรมน่าทำ" eyebrow="Things to do" icon={Sparkles} items={recommendations.do} cityName={city.name} />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <PaperCard
            eyebrow="Earthquake watch"
            title="แผ่นดินไหวรอบ 72 ชม."
            icon={Activity}
            description={`เฝ้าดูแผ่นดินไหวใกล้ ${city.name} (รัศมี ~350 กม.) และเหตุรุนแรงทั่วญี่ปุ่น จากข้อมูล JMA`}
          >
            <div className="mt-4 space-y-3">
              {quakes.available && quakes.items.length ? (
                quakes.items.map((item) => (
                  <div
                    key={`${item.time}-${item.place}`}
                    className="rounded-[22px] border border-[var(--line)] bg-[rgba(255,253,249,0.84)] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {item.place}
                        {item.tsunami ? <span className="ml-2 rounded-full bg-[#9c3d31] px-2 py-0.5 text-[10px] font-semibold text-white">เฝ้าระวังสึนามิ</span> : null}
                      </p>
                      <p className="shrink-0 text-sm font-semibold text-[var(--accent)]">
                        {typeof item.magnitude === "number" ? `M${item.magnitude}` : "M–"}
                      </p>
                    </div>
                    <p className="mt-1 text-xs leading-6 text-[var(--ink-muted)]">
                      {[
                        item.shindo ? `แรงสั่นสูงสุดระดับ ${item.shindo}` : null,
                        item.distanceKm !== null ? `ห่างประมาณ ${item.distanceKm} กม.` : null,
                        `${item.time} JST`,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-[var(--line-strong)] bg-[rgba(255,253,249,0.8)] px-4 py-4 text-sm leading-7 text-[var(--ink-muted)]">
                  {quakes.available
                    ? `ไม่มีแผ่นดินไหวที่น่ากังวลใกล้ ${city.name} ในช่วง 72 ชั่วโมงที่ผ่านมา`
                    : quakes.message ?? "ยังเชื่อมต่อข้อมูลแผ่นดินไหวไม่ได้ในตอนนี้"}
                </div>
              )}
            </div>
          </PaperCard>

          <PaperCard
            eyebrow="Money"
            title="เรทเงินสำหรับทริป"
            icon={Banknote}
            description="อัตราแลกเปลี่ยนกลางเยน-บาท อัปเดตทุก 6 ชั่วโมง ใช้กะงบหน้างานได้เลย"
          >
            <div className="mt-4 space-y-3">
              {fx.available && fx.thbPer100Jpy !== null ? (
                <>
                  <SignalRow label="100 เยน" value={`≈ ${fx.thbPer100Jpy.toFixed(2)} บาท`} note="ค่าน้ำ ขนม ของจุกจิก" />
                  <SignalRow
                    label="1,000 เยน"
                    value={`≈ ${(fx.thbPer100Jpy * 10).toFixed(0)} บาท`}
                    note="ราเมงหนึ่งชาม / ตั๋วรถไฟในเมือง"
                  />
                  <SignalRow
                    label="10,000 เยน"
                    value={`≈ ${(fx.thbPer100Jpy * 100).toFixed(0)} บาท`}
                    note="งบกินเที่ยวสบาย ๆ หนึ่งวัน"
                  />
                  {fx.jpyPer100Thb !== null ? (
                    <p className="px-1 text-xs text-[var(--ink-muted)]">กลับด้าน: 100 บาท ≈ {fx.jpyPer100Thb.toFixed(0)} เยน</p>
                  ) : null}
                </>
              ) : (
                <div className="rounded-[22px] border border-dashed border-[var(--line-strong)] bg-[rgba(255,253,249,0.8)] px-4 py-4 text-sm leading-7 text-[var(--ink-muted)]">
                  ยังดึงอัตราแลกเปลี่ยนไม่ได้ในตอนนี้ ลองรีเฟรชอีกครั้ง
                </div>
              )}
            </div>
          </PaperCard>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
          <PaperCard
            eyebrow="RSS / alerts"
            title="เหตุการณ์และข่าวที่ควรรู้"
            icon={Waves}
            description="รวม feed ล่าสุดที่ช่วยเช็กว่าวันนี้มีข่าวหรือกิจกรรมที่น่ารู้ก่อนออกเที่ยวหรือไม่"
          >
            <div className="mt-5 grid gap-3">
              {events.available ? (
                events.items.map((item) => (
                  <a
                    key={`${item.url}-${item.title}`}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-[24px] border border-[var(--line)] bg-[rgba(255,253,249,0.9)] p-4 transition hover:border-[var(--line-strong)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">{item.title}</p>
                        <p className="mt-2 text-xs text-[var(--ink-muted)]">
                          {[item.source ?? events.source, item.publishedAt ? formatPublishedAt(item.publishedAt) : null].filter(Boolean).join(" • ")}
                        </p>
                      </div>
                      <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
                    </div>
                  </a>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-[var(--line-strong)] bg-[rgba(255,253,249,0.8)] p-5 text-sm leading-7 text-[var(--ink-muted)]">
                  {events.message ?? "ยังไม่มี feed ล่าสุดในตอนนี้"}
                </div>
              )}
            </div>
          </PaperCard>

          <section id="assistant" className="rounded-[36px] border border-[rgba(255,248,240,0.16)] bg-[#232830] p-5 text-[#f7f2ea] shadow-[0_24px_90px_rgba(31,36,48,0.16)] md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[#cda47f]">AI insight</p>
                <h2 className="mt-2 font-serif text-3xl">คุยโต้ตอบเพื่อวางแผนทริป</h2>
                <p className="mt-3 text-sm leading-7 text-[#ddd5cb]">
                  ถามต่อจากข้อมูลเมือง อากาศ ข่าว และ recommendation บนหน้านี้ได้เลย
                </p>
              </div>
              <MessagesSquare className="mt-1 h-5 w-5 text-[#d7b08a]" aria-hidden />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => submitPrompt(prompt)}
                  className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm text-[#f4ede6] transition hover:bg-white/10"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-3 rounded-[28px] border border-white/8 bg-white/4 p-4">
              <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                {chatMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={
                      message.role === "assistant"
                        ? "mr-8 rounded-[22px] border border-white/8 bg-white/6 p-4"
                        : "ml-8 rounded-[22px] bg-[#efe2d0] p-4 text-[#232830]"
                    }
                  >
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em]">
                      {message.role === "assistant" ? <Bot className="h-3.5 w-3.5" aria-hidden /> : <Compass className="h-3.5 w-3.5" aria-hidden />}
                      {message.role === "assistant" ? "AI Assistant" : "You"}
                    </div>
                    <p className="whitespace-pre-line text-sm leading-7">{message.content}</p>
                  </div>
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
                  placeholder="ถาม เช่น ถ้าฝน 70% ควรสลับไปย่านไหนก่อน"
                  maxLength={300}
                  rows={3}
                  className="w-full rounded-[22px] border border-white/10 bg-[#1a1f27] px-4 py-3 text-sm text-white outline-none placeholder:text-[#9d978f]"
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {chatError ? <p className="text-sm text-[#f2b3a3]">{chatError}</p> : <span className="text-xs text-[#bdb5aa]">ตอบจากข้อมูลล่าสุดเท่าที่หน้าแอปมี</span>}
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center justify-center rounded-full bg-[#efe2d0] px-5 py-3 text-sm font-medium text-[#232830] transition hover:bg-[#f5eadb] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isPending ? "กำลังคิด..." : "ถาม AI Insight"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </section>
      </div>

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
    </main>
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
  icon: typeof Tv;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[34px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_18px_70px_rgba(31,36,48,0.05)] md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--accent-warm)]">{eyebrow}</p>
          <h3 className="mt-2 font-serif text-2xl text-[var(--foreground)]">{title}</h3>
          <p className="mt-3 text-sm leading-7 text-[var(--ink-muted)]">{description}</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[rgba(255,253,249,0.76)] p-3 text-[var(--accent)]">
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

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Thermometer;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[rgba(255,251,245,0.10)] p-4 backdrop-blur">
      <div className="flex items-center gap-2 text-sm text-white/76">
        <Icon className="h-4 w-4" aria-hidden />
        <span>{label}</span>
      </div>
      <p className="mt-3 font-serif text-3xl text-white">{value}</p>
      <p className="mt-2 text-xs leading-6 text-white/72">{detail}</p>
    </div>
  );
}

function SignalRow({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[22px] border border-[var(--line)] bg-[rgba(255,253,249,0.84)] px-4 py-3">
      <div>
        <p className="text-sm font-medium text-[var(--foreground)]">{label}</p>
        <p className="mt-1 text-xs leading-6 text-[var(--ink-muted)]">{note}</p>
      </div>
      <p className="text-right text-lg font-medium text-[var(--accent)]">{value}</p>
    </div>
  );
}

function IdeaColumn({
  title,
  eyebrow,
  icon: Icon,
  items,
  cityName,
}: {
  title: string;
  eyebrow: string;
  icon: typeof Compass;
  items: RecommendationWithImage[];
  cityName: string;
}) {
  return (
    <section className="overflow-hidden rounded-[34px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_18px_70px_rgba(31,36,48,0.05)]">
      <div className="border-b border-[var(--line)] bg-[rgba(255,252,248,0.75)] px-5 py-5 md:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--accent-warm)]">{eyebrow}</p>
            <h2 className="mt-2 font-serif text-3xl text-[var(--foreground)]">{title}</h2>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-[var(--accent)]">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        </div>
      </div>

      <div className="space-y-3 p-5 md:p-6">
        {items.map((item) => (
          <a
            key={`${item.kind}-${item.title}`}
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.title} ${item.area} ${cityName} Japan`)}`}
            target="_blank"
            rel="noreferrer"
            className="group block overflow-hidden rounded-[24px] border border-[var(--line)] bg-[rgba(255,253,249,0.88)] transition hover:border-[var(--line-strong)] hover:shadow-[0_16px_44px_rgba(31,36,48,0.08)]"
          >
            {item.image ? (
              <div className="relative h-36 overflow-hidden bg-[linear-gradient(180deg,#e7ded1,#d7dde3)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(31,36,48,0.28))]" />
              </div>
            ) : null}
            <div className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-lg font-medium text-[var(--foreground)]">{item.title}</h3>
                  <div className="mt-2 flex items-center gap-2 text-xs text-[var(--ink-muted)]">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>{item.area}</span>
                  </div>
                </div>
                <span className="max-w-full shrink-0 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-[11px] font-medium text-[var(--ink-muted)]">
                  {item.signal}
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-muted)]">{item.note}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
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
