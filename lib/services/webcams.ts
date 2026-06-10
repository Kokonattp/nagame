import type { CityConfig } from "@/lib/cities/city-configs";
import { cached } from "@/lib/utils/cache";

export type WebcamOption = {
  title: string;
  url: string | null;
  previewImage: string | null;
  source: string;
};

export type WebcamSignal = {
  available: boolean;
  source: string;
  title: string | null;
  url: string | null;
  previewImage: string | null;
  options: WebcamOption[];
  updatedAt: string;
  message?: string;
};

type WindyWebcam = {
  title?: string;
  images?: {
    current?: {
      preview?: string;
      thumbnail?: string;
    };
  };
  player?: {
    day?: string;
    live?: string;
  };
  urls?: {
    detail?: string;
  };
};

type WindyResponse = {
  webcams?: WindyWebcam[];
};

export async function getWebcams(lat: number, lon: number, cityConfig?: CityConfig): Promise<WebcamSignal> {
  const ttlSeconds = process.env.WINDY_WEBCAMS_API_KEY ? 60 * 9 : 60 * 30;

  return cached(`webcam:${lat.toFixed(3)}:${lon.toFixed(3)}`, ttlSeconds, async () => {
    if (process.env.WINDY_WEBCAMS_API_KEY) {
      const windy = await getWindyWebcam(lat, lon);
      if (windy.available) return windy;
    }

    if (cityConfig?.livecam) {
      const option = {
        title: cityConfig.livecam.title,
        source: cityConfig.livecam.source,
        url: cityConfig.livecam.url,
        previewImage: cityConfig.livecam.previewImage ?? null,
      };

      return {
        available: true,
        source: cityConfig.livecam.source,
        title: cityConfig.livecam.title,
        url: cityConfig.livecam.url,
        previewImage: cityConfig.livecam.previewImage ?? null,
        options: [option],
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      available: false,
      source: "Unavailable",
      title: null,
      url: null,
      previewImage: null,
      options: [],
      updatedAt: new Date().toISOString(),
      message: "ยังไม่พบ livecam ใกล้เมืองนี้",
    };
  });
}

async function getWindyWebcam(lat: number, lon: number): Promise<WebcamSignal> {
  try {
    const url = new URL("https://api.windy.com/webcams/api/v3/webcams");
    url.searchParams.set("nearby", `${lat},${lon},50`);
    url.searchParams.set("include", "images,player,urls");
    url.searchParams.set("limit", "8");

    const response = await fetch(url, {
      headers: {
        "x-windy-api-key": process.env.WINDY_WEBCAMS_API_KEY ?? "",
      },
      next: { revalidate: 1800 },
    });

    if (!response.ok) throw new Error("Windy unavailable");
    const data = (await response.json()) as WindyResponse;
    const options = (data.webcams ?? [])
      .map((item) => ({
        title: item.title ?? "Live camera",
        url: item.player?.live ?? item.player?.day ?? item.urls?.detail ?? null,
        previewImage: item.images?.current?.preview ?? item.images?.current?.thumbnail ?? null,
        source: "Windy Webcams",
      }))
      .filter((item) => item.previewImage || item.url);

    const webcam = options[0];
    if (!webcam) throw new Error("No webcam");

    return {
      available: true,
      source: webcam.source,
      title: webcam.title,
      url: webcam.url,
      previewImage: webcam.previewImage,
      options,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return {
      available: false,
      source: "Windy Webcams",
      title: null,
      url: null,
      previewImage: null,
      options: [],
      updatedAt: new Date().toISOString(),
      message: "Windy webcam ยังไม่พร้อม",
    };
  }
}
