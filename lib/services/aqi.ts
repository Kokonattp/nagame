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
    if (process.env.OPENAQ_API_KEY) {
      const openAq = await getOpenAqAqi(lat, lon);
      if (openAq.available) return openAq;
    }

    return getOpenMeteoAqi(lat, lon);
  });
}

type OpenAqLocations = {
  results?: {
    id: number;
  }[];
};

type OpenAqLatest = {
  results?: {
    value: number;
    datetime?: {
      utc?: string;
    };
  }[];
};

async function getOpenAqAqi(lat: number, lon: number): Promise<AqiSignal> {
  try {
    const locationsUrl = new URL("https://api.openaq.org/v3/locations");
    locationsUrl.searchParams.set("coordinates", `${lat.toFixed(4)},${lon.toFixed(4)}`);
    locationsUrl.searchParams.set("radius", "25000");
    locationsUrl.searchParams.set("iso", "JP");
    locationsUrl.searchParams.set("parameters_id", "2");
    locationsUrl.searchParams.set("limit", "1");

    const locationResponse = await fetch(locationsUrl, {
      headers: { "X-API-Key": process.env.OPENAQ_API_KEY ?? "" },
      next: { revalidate: 1800 },
    });

    if (!locationResponse.ok) throw new Error("OpenAQ locations unavailable");
    const locations = (await locationResponse.json()) as OpenAqLocations;
    const locationId = locations.results?.[0]?.id;
    if (!locationId) throw new Error("No OpenAQ station nearby");

    const latestUrl = new URL(`https://api.openaq.org/v3/locations/${locationId}/latest`);
    latestUrl.searchParams.set("limit", "10");

    const latestResponse = await fetch(latestUrl, {
      headers: { "X-API-Key": process.env.OPENAQ_API_KEY ?? "" },
      next: { revalidate: 1800 },
    });

    if (!latestResponse.ok) throw new Error("OpenAQ latest unavailable");
    const latest = (await latestResponse.json()) as OpenAqLatest;
    const pm25 = latest.results?.find((result) => typeof result.value === "number")?.value;
    if (typeof pm25 !== "number") throw new Error("No PM2.5 reading");

    const aqi = pm25ToUsAqi(pm25);

    return {
      available: true,
      source: "OpenAQ",
      aqi,
      pm25: round(pm25, 1),
      label: aqiLabel(aqi),
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return {
      available: false,
      source: "OpenAQ",
      aqi: null,
      pm25: null,
      label: "ไม่พร้อม",
      updatedAt: new Date().toISOString(),
      message: "OpenAQ ยังไม่มีข้อมูลใกล้เมืองนี้",
    };
  }
}

function pm25ToUsAqi(pm25: number) {
  const ranges = [
    { cLow: 0, cHigh: 9, iLow: 0, iHigh: 50 },
    { cLow: 9.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
    { cLow: 55.5, cHigh: 125.4, iLow: 151, iHigh: 200 },
    { cLow: 125.5, cHigh: 225.4, iLow: 201, iHigh: 300 },
    { cLow: 225.5, cHigh: 325.4, iLow: 301, iHigh: 500 },
  ];
  const range = ranges.find((item) => pm25 >= item.cLow && pm25 <= item.cHigh) ?? ranges.at(-1);
  if (!range) return null;

  return round(((range.iHigh - range.iLow) / (range.cHigh - range.cLow)) * (pm25 - range.cLow) + range.iLow);
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
