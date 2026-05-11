import { cached } from "@/lib/utils/cache";
import { round, weatherCodeToText } from "@/lib/utils/format";

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
  windSpeed: number | null;
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
    main?: { temp_min?: number; temp_max?: number };
    pop?: number;
  }[];
};

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
    const today = forecast.list?.slice(0, 8) ?? [];
    const highs = today.map((item) => item.main?.temp_max).filter((v): v is number => typeof v === "number");
    const lows = today.map((item) => item.main?.temp_min).filter((v): v is number => typeof v === "number");
    const rainChance = Math.max(...today.map((item) => item.pop ?? 0), 0) * 100;

    return {
      available: true,
      source: "OpenWeather",
      temperature: round(current.main?.temp),
      feelsLike: round(current.main?.feels_like),
      high: highs.length ? round(Math.max(...highs)) : null,
      low: lows.length ? round(Math.min(...lows)) : null,
      condition: current.weather?.[0]?.description ?? "ยังไม่มีข้อมูล",
      weatherCode: current.weather?.[0]?.id ?? null,
      rainChance: round(rainChance),
      windSpeed: round((current.wind?.speed ?? 0) * 3.6, 1),
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return unavailableWeather("OpenWeather ยังไม่พร้อม ใช้ fallback ไม่สำเร็จ");
  }
}

async function getOpenMeteoWeather(lat: number, lon: number): Promise<WeatherSignal> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("timezone", "Asia/Tokyo");
    url.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code,wind_speed_10m");
    url.searchParams.set("hourly", "precipitation_probability");
    url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max");
    url.searchParams.set("forecast_days", "1");

    const response = await fetch(url, { next: { revalidate: 1800 } });
    if (!response.ok) throw new Error("Open-Meteo unavailable");
    const data = (await response.json()) as OpenMeteoForecast;

    const weatherCode = data.current?.weather_code ?? null;
    const hourlyRain = data.hourly?.precipitation_probability?.slice(0, 12) ?? [];
    const rainChance =
      data.daily?.precipitation_probability_max?.[0] ??
      (hourlyRain.length ? Math.max(...hourlyRain) : null);

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
      windSpeed: round(data.current?.wind_speed_10m, 1),
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
    windSpeed: null,
    updatedAt: new Date().toISOString(),
    message,
  };
}
