"use client";

import { Bell, CloudSun, Droplets, MapPin, Search, ThermometerSun } from "lucide-react";
import { ShareableCard } from "@/components/bento/shareable-card";
import type { WeatherSignal } from "@/lib/services/weather";
import { cn } from "@/lib/utils/cn";

export function WeatherBento({
  cityName,
  japaneseName,
  weather,
  heroTone,
}: {
  cityName: string;
  japaneseName?: string;
  weather: WeatherSignal;
  heroTone: string;
}) {
  const heroImage =
    cityName.toLowerCase() === "fukuoka"
      ? "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/View_from_Fukuoka_Tower_at_Blue_Hour.jpg/1280px-View_from_Fukuoka_Tower_at_Blue_Hour.jpg"
      : "https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=900&q=82";

  return (
    <ShareableCard
      title={`${cityName}-weather`}
      className={cn("min-h-[485px] rounded-b-[2.25rem] rounded-t-none border-0 bg-gradient-to-br p-6 text-white shadow-none lg:h-full lg:min-h-[720px] lg:rounded-[2rem] lg:p-8 lg:shadow-2xl lg:shadow-black/25", heroTone)}
    >
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImage})` }} />
      <div className="absolute inset-0 bg-gradient-to-b from-sky-900/15 via-sky-700/10 to-zinc-950/45" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_32%,rgba(255,255,255,0.36),transparent_24%)]" />
      <div className="relative z-10 flex h-full min-h-[435px] flex-col justify-between lg:min-h-[660px]">
        <div className="flex items-center justify-between pr-11 text-sm font-bold">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-white/85" />
            <span className="h-2.5 w-4 rounded-sm bg-white/70" />
            <span className="h-2.5 w-5 rounded-sm border border-white/80 bg-white/20" />
          </div>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-black leading-none tracking-normal lg:text-6xl">Nagame</h1>
            {japaneseName ? <p className="mt-1 text-2xl font-bold text-white/85 lg:text-4xl">{japaneseName}</p> : null}
          </div>
          <div className="flex items-center gap-4 pr-8">
            <Search className="h-6 w-6 text-white/90" aria-hidden />
            <div className="relative">
              <Bell className="h-6 w-6 text-white/90" aria-hidden />
              <span className="absolute -right-0.5 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
            </div>
          </div>
        </div>

        <div>
          <div className="mb-6 flex items-center gap-2 text-sm font-black uppercase tracking-normal text-white/90">
            <MapPin className="h-4 w-4" aria-hidden />
            <span>{cityName}, Japan</span>
          </div>
          <div className="flex items-center gap-5">
            <CloudSun className="h-20 w-20 drop-shadow-lg" aria-hidden />
            <div>
              <div className="flex items-start gap-1">
                <span className="text-7xl font-black leading-none tracking-normal lg:text-9xl">
                  {weather.temperature ?? "--"}
                </span>
                <span className="mt-1 text-4xl font-bold">°</span>
              </div>
              <p className="mt-1 text-lg font-bold lg:text-2xl">{weather.condition}</p>
              <p className="text-sm font-semibold text-white/82 lg:text-base">รู้สึกเหมือน {weather.feelsLike ?? "--"}°</p>
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <div className="rounded-3xl border border-white/30 bg-white/18 px-6 py-4 text-right shadow-xl shadow-black/10 backdrop-blur-xl">
              <p className="text-lg font-bold">สูงสุด {weather.high ?? "--"}°</p>
              <p className="text-lg font-bold text-white/82">ต่ำสุด {weather.low ?? "--"}°</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <div className="rounded-3xl bg-white/18 p-3 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-white/75">
                <ThermometerSun className="h-4 w-4" aria-hidden />
                <span className="text-xs font-semibold">Feels like</span>
              </div>
              <p className="mt-1 text-lg font-bold">{weather.feelsLike ?? "--"}°</p>
            </div>
            <div className="rounded-3xl bg-white/18 p-3 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-white/75">
                <Droplets className="h-4 w-4" aria-hidden />
                <span className="text-xs font-semibold">High / Low</span>
              </div>
              <p className="mt-1 text-lg font-bold">
                {weather.high ?? "--"}° / {weather.low ?? "--"}°
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-white/70">
            Source: {weather.source}
            {cityName.toLowerCase() === "fukuoka" ? " · Image: Steffen Flor / Wikimedia Commons" : ""}
          </p>
        </div>
      </div>
    </ShareableCard>
  );
}
