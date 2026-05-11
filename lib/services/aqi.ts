import { cached } from "@/lib/utils/cache";
import { aqiLabel, round } from "@/lib/utils/format";

export type AqiSignal = {
  available: boolean;
  source: string;
  aqi: number | null;
  pm25: number | null;
  label: string;
  updatedAt: string;
  message?: string;
};

type OpenMeteoAir = {
  current?: {
    us_aqi?: number;
    pm2_5?: number;
  };
};

export async function getAqi(lat: number, lon: number): Promise<AqiSignal> {
  return cached(`aqi:${lat.toFixed(3)}:${lon.toFixed(3)}`, 60 * 30, async () => {
    return getOpenMeteoAqi(lat, lon);
  });
}

async function getOpenMeteoAqi(lat: number, lon: number): Promise<AqiSignal> {
  try {
    const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("timezone", "Asia/Tokyo");
    url.searchParams.set("current", "us_aqi,pm2_5");

    const response = await fetch(url, { next: { revalidate: 1800 } });
    if (!response.ok) throw new Error("AQI unavailable");
    const data = (await response.json()) as OpenMeteoAir;
    const aqi = round(data.current?.us_aqi);

    return {
      available: typeof aqi === "number",
      source: "Open-Meteo Air Quality",
      aqi,
      pm25: round(data.current?.pm2_5, 1),
      label: aqiLabel(aqi),
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return {
      available: false,
      source: "Unavailable",
      aqi: null,
      pm25: null,
      label: "ไม่พร้อม",
      updatedAt: new Date().toISOString(),
      message: "ยังดึงข้อมูล AQI ไม่ได้",
    };
  }
}
