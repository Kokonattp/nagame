import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { AqiBento } from "@/components/bento/aqi-bento";
import { RainBento } from "@/components/bento/rain-bento";
import { WeatherBento } from "@/components/bento/weather-bento";
import { CitySearch } from "@/components/city-search";
import { MobileShell } from "@/components/mobile-shell";
import { getCityConfigBySlug } from "@/lib/cities/city-configs";
import { japanMajorCities } from "@/lib/cities/japan-major-cities";
import { getAqi } from "@/lib/services/aqi";
import { getWeather } from "@/lib/services/weather";

export const revalidate = 1800;

export default async function Home() {
  const fukuoka = getCityConfigBySlug("fukuoka");
  const [weather, aqi] = await Promise.all([
    getWeather(fukuoka?.lat ?? 33.5902, fukuoka?.lon ?? 130.4017),
    getAqi(fukuoka?.lat ?? 33.5902, fukuoka?.lon ?? 130.4017),
  ]);

  return (
    <MobileShell>
      <div className="space-y-5">
        <section className="px-1 pt-2">
          <div className="flex items-center gap-2 text-sm font-black text-zinc-500">
            <MapPin className="h-4 w-4" aria-hidden />
            Live travel signals for Japan
          </div>
          <h1 className="mt-3 text-5xl font-black leading-none tracking-normal">
            Nagame
            <span className="block text-3xl text-zinc-500">眺め</span>
          </h1>
          <p className="mt-4 max-w-xs text-base font-medium leading-7 text-zinc-600">
            ค้นหาเมืองในญี่ปุ่น แล้วดูสัญญาณจริงแบบเร็ว ๆ ว่าวันนี้ไปไหนดี กินอะไรดี นอนไหนดี
          </p>
        </section>

        <CitySearch seeds={japanMajorCities} />

        <WeatherBento
          cityName="Fukuoka"
          japaneseName={fukuoka?.japaneseName}
          weather={weather}
          heroTone={fukuoka?.heroTone ?? "from-sky-500 via-cyan-200 to-amber-100"}
        />

        <div className="grid grid-cols-2 gap-3">
          <RainBento rainChance={weather.rainChance} />
          <AqiBento aqi={aqi} />
        </div>

        <Link
          href="/city/fukuoka"
          className="flex items-center justify-between rounded-3xl bg-zinc-950 p-5 text-white shadow-2xl shadow-zinc-950/15"
        >
          <span className="text-lg font-black">เปิดหน้า Fukuoka แบบเต็ม</span>
          <ArrowRight className="h-5 w-5" aria-hidden />
        </Link>
      </div>
    </MobileShell>
  );
}
