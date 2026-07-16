import { cached } from "@/lib/utils/cache";
import { openWeatherIdToText, round, weatherCodeToText } from "@/lib/utils/format";

export type RainByPeriod = {
  morning: number | null;
  afternoon: number | null;
  evening: number | null;
};

// พยากรณ์รายวันล่วงหน้า — ให้กร๊วกตอบ "พรุ่งนี้/สุดสัปดาห์นี้ฝนไหม" ได้
// (เดิมขอแค่วันเดียว ตอบได้แค่ "ตอนนี้"). Open-Meteo ให้ฟรีถึง 16 วัน
export type DayOutlook = {
  date: string; // YYYY-MM-DD (JST)
  high: number | null;
  low: number | null;
  rainChance: number | null;
  condition: string;
};

export type WeatherSignal = {
  available: boolean;
  source: string;
  temperature: number | null;
  feelsLike: number | null;
  high: number | null;
  low: number | null;
  condition: string;
  weatherCode: number | null;
  rainChance: number | null;
  rainByPeriod: RainByPeriod;
  windSpeed: number | null;
  /** วันนี้ + ล่วงหน้าสูงสุด 16 วัน (ว่าง = แหล่งข้อมูลไม่รองรับ) */
  outlook: DayOutlook[];
  updatedAt: string;
  message?: string;
};

type OpenMeteoForecast = {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  hourly?: {
    time?: string[];
    precipitation_probability?: number[];
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
  };
};

type OpenWeatherCurrent = {
  main?: { temp?: number; feels_like?: number };
  weather?: { description?: string; id?: number }[];
  wind?: { speed?: number };
};

type OpenWeatherForecast = {
  list?: {
    dt?: number;
    main?: { temp_min?: number; temp_max?: number };
    weather?: { id?: number }[];
    pop?: number;
  }[];
};

// ช่วงเวลาสำหรับวางแผนวัน (ชั่วโมงตามเวลาญี่ปุ่น)
const DAY_PERIODS = {
  morning: { from: 9, to: 12 },
  afternoon: { from: 12, to: 17 },
  evening: { from: 17, to: 21 },
} as const;

function emptyRainByPeriod(): RainByPeriod {
  return { morning: null, afternoon: null, evening: null };
}

function rainPeriodFromEntries(entries: { hour: number; probability: number }[]): RainByPeriod {
  const result = emptyRainByPeriod();
  for (const [period, range] of Object.entries(DAY_PERIODS) as [keyof RainByPeriod, { from: number; to: number }][]) {
    const values = entries
      .filter((entry) => entry.hour >= range.from && entry.hour < range.to)
      .map((entry) => entry.probability);
    result[period] = values.length ? Math.round(Math.max(...values)) : null;
  }
  return result;
}

export async function getWeather(lat: number, lon: number): Promise<WeatherSignal> {
  return cached(`weather:${lat.toFixed(3)}:${lon.toFixed(3)}`, 60 * 30, async () => {
    if (process.env.OPENWEATHER_API_KEY) {
      const fromOpenWeather = await getOpenWeather(lat, lon);
      if (fromOpenWeather.available) return fromOpenWeather;
    }

    return getOpenMeteoWeather(lat, lon);
  });
}

async function getOpenWeather(lat: number, lon: number): Promise<WeatherSignal> {
  try {
    const key = process.env.OPENWEATHER_API_KEY;
    const currentUrl = new URL("https://api.openweathermap.org/data/2.5/weather");
    currentUrl.searchParams.set("lat", String(lat));
    currentUrl.searchParams.set("lon", String(lon));
    currentUrl.searchParams.set("appid", key ?? "");
    currentUrl.searchParams.set("units", "metric");
    currentUrl.searchParams.set("lang", "th");

    const forecastUrl = new URL("https://api.openweathermap.org/data/2.5/forecast");
    forecastUrl.searchParams.set("lat", String(lat));
    forecastUrl.searchParams.set("lon", String(lon));
    forecastUrl.searchParams.set("appid", key ?? "");
    forecastUrl.searchParams.set("units", "metric");

    const [currentResponse, forecastResponse] = await Promise.all([
      fetch(currentUrl, { next: { revalidate: 1800 } }),
      fetch(forecastUrl, { next: { revalidate: 1800 } }),
    ]);

    if (!currentResponse.ok || !forecastResponse.ok) {
      throw new Error("OpenWeather unavailable");
    }

    const current = (await currentResponse.json()) as OpenWeatherCurrent;
    const forecast = (await forecastResponse.json()) as OpenWeatherForecast;
    const allEntries = forecast.list ?? [];
    const today = allEntries.slice(0, 8) ?? [];
    const highs = today.map((item) => item.main?.temp_max).filter((v): v is number => typeof v === "number");
    const lows = today.map((item) => item.main?.temp_min).filter((v): v is number => typeof v === "number");
    const rainChance = Math.max(...today.map((item) => item.pop ?? 0), 0) * 100;
    // forecast เป็นช่วงละ 3 ชม. — แปลง dt เป็นชั่วโมง JST แล้วสรุปฝนต่อช่วงของวัน
    const rainByPeriod = rainPeriodFromEntries(
      today
        .filter((item) => typeof item.dt === "number")
        .map((item) => ({
          hour: new Date((item.dt! + 9 * 3600) * 1000).getUTCHours(),
          probability: (item.pop ?? 0) * 100,
        })),
    );

    return {
      available: true,
      source: "OpenWeather",
      temperature: round(current.main?.temp),
      feelsLike: round(current.main?.feels_like),
      high: highs.length ? round(Math.max(...highs)) : null,
      low: lows.length ? round(Math.min(...lows)) : null,
      // ใช้คำไทยของเราเองแทน description ที่ OpenWeather แปลมา (สำนวนแปลอ่านแล้วงง เช่น "เมฆเต็มท้องฟ้า")
      condition: openWeatherIdToText(current.weather?.[0]?.id) ?? current.weather?.[0]?.description ?? "ยังไม่มีข้อมูล",
      weatherCode: current.weather?.[0]?.id ?? null,
      rainChance: round(rainChance),
      rainByPeriod,
      windSpeed: round((current.wind?.speed ?? 0) * 3.6, 1),
      outlook: buildOutlookFromOpenWeather(allEntries),
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return unavailableWeather("OpenWeather ยังไม่พร้อม ใช้ fallback ไม่สำเร็จ");
  }
}

// เพดานฟรีของ Open-Meteo. OpenWeather (fallback) ให้แค่ 5 วัน/ช่วง 3 ชม. → outlook สั้นกว่า
const OUTLOOK_DAYS = 16;

// OpenWeather ให้เป็นช่วงละ 3 ชม. ไม่ใช่รายวัน → จับกลุ่มตามวัน JST เอง
// (สรุป: สูง=max, ต่ำ=min, ฝน=max ของวันนั้น, สภาพ=code ที่เจอบ่อยสุด)
function buildOutlookFromOpenWeather(entries: NonNullable<OpenWeatherForecast["list"]>): DayOutlook[] {
  const byDate = new Map<string, { highs: number[]; lows: number[]; pops: number[]; codes: number[] }>();

  for (const entry of entries) {
    if (typeof entry.dt !== "number") continue;
    // +9 ชม. = JST แล้วตัดเอาเฉพาะวันที่
    const date = new Date((entry.dt + 9 * 3600) * 1000).toISOString().slice(0, 10);
    const bucket = byDate.get(date) ?? { highs: [], lows: [], pops: [], codes: [] };
    if (typeof entry.main?.temp_max === "number") bucket.highs.push(entry.main.temp_max);
    if (typeof entry.main?.temp_min === "number") bucket.lows.push(entry.main.temp_min);
    if (typeof entry.pop === "number") bucket.pops.push(entry.pop * 100);
    if (typeof entry.weather?.[0]?.id === "number") bucket.codes.push(entry.weather[0].id);
    byDate.set(date, bucket);
  }

  return [...byDate.entries()].map(([date, b]) => ({
    date,
    high: b.highs.length ? round(Math.max(...b.highs)) : null,
    low: b.lows.length ? round(Math.min(...b.lows)) : null,
    rainChance: b.pops.length ? round(Math.max(...b.pops)) : null,
    condition: openWeatherIdToText(mostCommon(b.codes)) ?? "ยังไม่มีข้อมูล",
  }));
}

function mostCommon(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const tally = new Map<number, number>();
  for (const v of values) tally.set(v, (tally.get(v) ?? 0) + 1);
  return [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

// daily arrays ของ Open-Meteo เรียงตรงกันทุกช่อง (index เดียวกัน = วันเดียวกัน)
function buildOutlook(daily: OpenMeteoForecast["daily"]): DayOutlook[] {
  const dates = daily?.time ?? [];
  return dates.map((date, index) => ({
    date,
    high: round(daily?.temperature_2m_max?.[index]),
    low: round(daily?.temperature_2m_min?.[index]),
    rainChance: round(daily?.precipitation_probability_max?.[index]),
    condition: weatherCodeToText(daily?.weather_code?.[index] ?? null),
  }));
}

async function getOpenMeteoWeather(lat: number, lon: number): Promise<WeatherSignal> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("timezone", "Asia/Tokyo");
    url.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code,wind_speed_10m");
    url.searchParams.set("hourly", "precipitation_probability");
    url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max");
    // 16 วัน = เพดานฟรีของ Open-Meteo → กร๊วกตอบ "พรุ่งนี้/สุดสัปดาห์นี้" ได้
    url.searchParams.set("forecast_days", String(OUTLOOK_DAYS));

    const response = await fetch(url, { next: { revalidate: 1800 } });
    if (!response.ok) throw new Error("Open-Meteo unavailable");
    const data = (await response.json()) as OpenMeteoForecast;

    const weatherCode = data.current?.weather_code ?? null;
    // hourly ยาว 16 วันแล้ว — rainByPeriod ต้องเป็น "วันนี้" เท่านั้น จึงตัดแค่ 24 ชม.แรก
    // (ถ้าปล่อยทั้งก้อน ช่วงเช้าจะเอาค่าเช้าของ 16 วันมารวมกัน = ผิด)
    const hourlyTimes = data.hourly?.time ?? [];
    const hourlyRainAll = data.hourly?.precipitation_probability ?? [];
    const rainChance =
      data.daily?.precipitation_probability_max?.[0] ??
      (hourlyRainAll.length ? Math.max(...hourlyRainAll.slice(0, 24)) : null);
    // hourly.time เป็นเวลา JST อยู่แล้ว (ตั้ง timezone ตอนขอ)
    const rainByPeriod = rainPeriodFromEntries(
      hourlyRainAll
        .slice(0, 24)
        .map((probability, index) => ({
          hour: Number(hourlyTimes[index]?.slice(11, 13) ?? NaN),
          probability,
        }))
        .filter((entry) => Number.isFinite(entry.hour)),
    );

    return {
      available: true,
      source: "Open-Meteo",
      temperature: round(data.current?.temperature_2m),
      feelsLike: round(data.current?.apparent_temperature),
      high: round(data.daily?.temperature_2m_max?.[0]),
      low: round(data.daily?.temperature_2m_min?.[0]),
      condition: weatherCodeToText(weatherCode),
      weatherCode,
      rainChance: round(rainChance),
      rainByPeriod,
      windSpeed: round(data.current?.wind_speed_10m, 1),
      outlook: buildOutlook(data.daily),
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return unavailableWeather("ยังดึงข้อมูลอากาศไม่ได้");
  }
}

function unavailableWeather(message: string): WeatherSignal {
  return {
    available: false,
    source: "Unavailable",
    temperature: null,
    feelsLike: null,
    high: null,
    low: null,
    condition: "ไม่มีข้อมูลอากาศ",
    weatherCode: null,
    rainChance: null,
    rainByPeriod: emptyRainByPeriod(),
    windSpeed: null,
    outlook: [],
    updatedAt: new Date().toISOString(),
    message,
  };
}
