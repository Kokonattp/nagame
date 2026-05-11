"use client";

import { CloudSun, Droplets, ThermometerSun } from "lucide-react";
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
  return (
    <ShareableCard
      title={`${cityName}-weather`}
      className={cn("min-h-[310px] bg-gradient-to-br p-5 text-white", heroTone)}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.5),transparent_24%),linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.28))]" />
      <div className="relative z-10 flex h-full min-h-[270px] flex-col justify-between">
        <div className="flex items-start justify-between pr-11">
          <div>
            <p className="text-sm font-semibold text-white/78">Nagame 眺め</p>
            <h1 className="mt-1 text-3xl font-black tracking-normal">{cityName}</h1>
            {japaneseName ? <p className="text-lg font-semibold text-white/80">{japaneseName}</p> : null}
          </div>
          <CloudSun className="h-8 w-8 text-white/85" aria-hidden />
        </div>

        <div>
          <div className="flex items-end gap-2">
            <span className="text-8xl font-black leading-none tracking-normal">
              {weather.temperature ?? "--"}
            </span>
            <span className="mb-3 text-4xl font-bold">°</span>
          </div>
          <p className="mt-2 text-xl font-bold">{weather.condition}</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/18 p-3 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-white/75">
                <ThermometerSun className="h-4 w-4" aria-hidden />
                <span className="text-xs font-semibold">Feels like</span>
              </div>
              <p className="mt-1 text-lg font-bold">{weather.feelsLike ?? "--"}°</p>
            </div>
            <div className="rounded-2xl bg-white/18 p-3 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-white/75">
                <Droplets className="h-4 w-4" aria-hidden />
                <span className="text-xs font-semibold">High / Low</span>
              </div>
              <p className="mt-1 text-lg font-bold">
                {weather.high ?? "--"}° / {weather.low ?? "--"}°
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-white/70">Source: {weather.source}</p>
        </div>
      </div>
    </ShareableCard>
  );
}
