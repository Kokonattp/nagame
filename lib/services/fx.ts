import { cached } from "@/lib/utils/cache";

export type FxSignal = {
  available: boolean;
  thbPer100Jpy: number | null;
  jpyPer100Thb: number | null;
  updatedAt: string;
};

type ErApiResponse = {
  result?: string;
  rates?: Record<string, number>;
  time_last_update_utc?: string;
};

export async function getFx(): Promise<FxSignal> {
  return cached("fx:jpy-thb", 60 * 60 * 6, async () => {
    try {
      const response = await fetch("https://open.er-api.com/v6/latest/JPY", {
        next: { revalidate: 21600 },
      });

      if (!response.ok) throw new Error("fx unavailable");
      const data = (await response.json()) as ErApiResponse;
      const thb = data.rates?.THB;

      if (data.result !== "success" || typeof thb !== "number" || thb <= 0) {
        throw new Error("fx invalid");
      }

      return {
        available: true,
        thbPer100Jpy: Math.round(thb * 100 * 100) / 100,
        jpyPer100Thb: Math.round((100 / thb) * 100) / 100,
        updatedAt: data.time_last_update_utc ?? new Date().toISOString(),
      };
    } catch {
      return {
        available: false,
        thbPer100Jpy: null,
        jpyPer100Thb: null,
        updatedAt: new Date().toISOString(),
      };
    }
  });
}
