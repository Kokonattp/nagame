import { notFound } from "next/navigation";
import { AqiBento } from "@/components/bento/aqi-bento";
import { AiInsightBento } from "@/components/bento/ai-insight-bento";
import { CrowdBento } from "@/components/bento/crowd-bento";
import { LivecamBento } from "@/components/bento/livecam-bento";
import { RainBento } from "@/components/bento/rain-bento";
import { WeatherBento } from "@/components/bento/weather-bento";
import { WindBento } from "@/components/bento/wind-bento";
import { BottomNav } from "@/components/bottom-nav";
import { MobileShell } from "@/components/mobile-shell";
import { RecommendationSection } from "@/components/sections/recommendation-section";
import { getCityConfigBySlug } from "@/lib/cities/city-configs";
import { getAqi } from "@/lib/services/aqi";
import { getAiSummary } from "@/lib/services/ai-summary";
import { getEvents } from "@/lib/services/events";
import { resolveCity } from "@/lib/services/geocode";
import { getWebcams } from "@/lib/services/webcams";
import { getWeather } from "@/lib/services/weather";

export const revalidate = 1800;

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const city = await resolveCity(slug);

  if (!city) notFound();

  const config = getCityConfigBySlug(city.slug);
  const [weather, aqi, webcam, events] = await Promise.all([
    getWeather(city.lat, city.lon),
    getAqi(city.lat, city.lon),
    getWebcams(city.lat, city.lon, config),
    getEvents(config),
  ]);

  const summary = await getAiSummary({
    cityName: city.name,
    cityConfig: config,
    weather,
    aqi,
    webcam,
    events,
  });

  const crowdScore = buildCrowdScore(config?.crowdBaseline, weather.rainChance);
  const recommendations = config?.recommendations ?? [];

  return (
    <MobileShell>
      <div className="space-y-5">
        <WeatherBento
          cityName={city.name}
          japaneseName={config?.japaneseName ?? city.japaneseName}
          weather={weather}
          heroTone={config?.heroTone ?? "from-sky-500 via-cyan-200 to-amber-100"}
        />

        <section id="signals" className="relative z-20 -mt-16 grid grid-cols-4 gap-2 px-4">
          <RainBento rainChance={weather.rainChance} />
          <AqiBento aqi={aqi} />
          <CrowdBento score={crowdScore} />
          <WindBento windSpeed={weather.windSpeed} />
        </section>

        <section id="livecam" className="grid grid-cols-2 gap-3 px-4">
          <LivecamBento webcam={webcam} cityName={city.name} />
          <AiInsightBento summary={summary} />
        </section>

        {events.available ? (
          <section className="mx-4 rounded-3xl border border-white/70 bg-white p-4 shadow-lg shadow-sky-950/5">
            <p className="text-sm font-bold text-zinc-500">Events</p>
            <div className="mt-3 grid gap-2">
              {events.items.map((item) => (
                <a key={item.url} href={item.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-zinc-950 underline-offset-4 hover:underline">
                  {item.title}
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <div id="local" className="space-y-7 pt-1">
          <RecommendationSection kind="see" configured={Boolean(config)} items={recommendations.filter((item) => item.kind === "see")} />
          <RecommendationSection kind="eat" configured={Boolean(config)} items={recommendations.filter((item) => item.kind === "eat")} />
          <RecommendationSection kind="sleep" configured={Boolean(config)} items={recommendations.filter((item) => item.kind === "sleep")} />
        </div>
      </div>
      <BottomNav />
    </MobileShell>
  );
}

function buildCrowdScore(baseline = 46, rainChance: number | null) {
  const rainAdjustment = typeof rainChance === "number" ? (rainChance >= 70 ? -14 : rainChance >= 40 ? -6 : 4) : 0;
  return Math.max(18, Math.min(92, baseline + rainAdjustment));
}
