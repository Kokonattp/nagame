import type { AqiSignal } from "@/lib/services/aqi";
import type { EventSignal } from "@/lib/services/events";
import type { WebcamSignal } from "@/lib/services/webcams";
import type { WeatherSignal } from "@/lib/services/weather";
import type { CityConfig } from "@/lib/cities/city-configs";
import { cached } from "@/lib/utils/cache";

export type SummaryInput = {
  cityName: string;
  cityConfig?: CityConfig;
  weather: WeatherSignal;
  aqi: AqiSignal;
  webcam: WebcamSignal;
  events: EventSignal;
};

export type SummarySignal = {
  available: boolean;
  source: string;
  text: string;
  updatedAt: string;
};

export async function getAiSummary(input: SummaryInput): Promise<SummarySignal> {
  return cached(`summary:${input.cityName}:${input.weather.updatedAt.slice(0, 13)}:${input.aqi.updatedAt.slice(0, 13)}`, 60 * 45, async () => {
    if (process.env.AI_API_KEY) {
      const aiText = await requestAiSummary(input);
      if (aiText) {
        return {
          available: true,
          source: "AI summary",
          text: aiText,
          updatedAt: new Date().toISOString(),
        };
      }
    }

    return {
      available: true,
      source: "Rule-based summary",
      text: buildDeterministicThaiSummary(input),
      updatedAt: new Date().toISOString(),
    };
  });
}

async function requestAiSummary(input: SummaryInput) {
  const prompt = [
    "เขียนสรุปภาษาไทยไม่เกิน 3 บรรทัดสำหรับแอป travel signal ญี่ปุ่น",
    "ห้ามเดาข้อมูลที่ไม่มี ให้บอกชัดว่าข้อมูลไหนยังไม่พร้อม",
    JSON.stringify({
      city: input.cityName,
      weather: input.weather.available
        ? {
            temp: input.weather.temperature,
            condition: input.weather.condition,
            rainChance: input.weather.rainChance,
            windSpeed: input.weather.windSpeed,
          }
        : null,
      aqi: input.aqi.available ? { aqi: input.aqi.aqi, label: input.aqi.label, pm25: input.aqi.pm25 } : null,
      webcamAvailable: input.webcam.available,
      eventsAvailable: input.events.available,
      configuredRecommendations: Boolean(input.cityConfig),
    }),
  ].join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You summarize travel signals only from provided data." },
          { role: "user", content: prompt },
        ],
        max_tokens: 120,
        temperature: 0.2,
      }),
      next: { revalidate: 2700 },
    });

    if (!response.ok) return null;
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim().slice(0, 260) ?? null;
  } catch {
    return null;
  }
}

function buildDeterministicThaiSummary({ cityName, weather, aqi, webcam, events }: SummaryInput) {
  const parts: string[] = [];

  if (weather.available) {
    const rain = typeof weather.rainChance === "number" ? ` โอกาสฝน ${weather.rainChance}%` : "";
    parts.push(`${cityName} วันนี้เหมาะกับการเดินเมืองแบบยืดหยุ่น: ${weather.condition}, ${weather.temperature ?? "-"}°C.${rain}`);
  } else {
    parts.push(`${cityName} ยังไม่มีข้อมูลอากาศล่าสุด จึงควรวางแผนแบบเผื่อเวลาไว้ก่อน`);
  }

  if (aqi.available) {
    parts.push(`อากาศอยู่ระดับ${aqi.label}${aqi.pm25 ? ` (PM2.5 ${aqi.pm25})` : ""}; ถ้าไวต่อฝุ่นให้พักในร่มเป็นช่วง ๆ`);
  } else {
    parts.push("ข้อมูล AQI ยังไม่พร้อม");
  }

  const missing = [
    webcam.available ? null : "livecam",
    events.available ? null : "events",
  ].filter(Boolean);
  if (missing.length) {
    parts.push(`ข้อมูลที่ยังไม่พร้อม: ${missing.join(", ")}`);
  }

  return parts.slice(0, 3).join(" ");
}
