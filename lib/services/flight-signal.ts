import { cached } from "@/lib/utils/cache";

// flight-signal — ราคาตั๋วบิน BKK→ญี่ปุ่น เป็น "optional enrichment" ที่เปราะที่สุดในระบบ.
// ตาม [[nagame-architecture-decisions]] + docs/chat-cards-roadmap.md Phase 1/3:
//   - ห้ามอยู่ใน critical path ของคำตอบ (ยิงขนาน timeout สั้น)
//   - พังต้อง "หายเงียบ" แต่ต่อผู้ใช้ต้อง "ซื่อสัตย์" — ไม่เดาราคา, ให้ deep-link Google Flights เสมอ
//   - cache หนัก (ราคาต่อช่วงเดือนไม่ต้อง realtime)
//
// dual-mode: ไม่มี FLI_API_URL → priceThb=null, การ์ดยังออก (route + deep-link) แต่ไม่มีตัวเลข
// = กร๊วกไม่เผลอสัญญาราคา. เจ้าของต่อ fli/แหล่งราคาแล้วใส่ env FLI_API_URL (+FLI_API_KEY) ทีหลัง.

export type FlightSignal = {
  route: string; // "BKK → NRT"
  priceThb: number | null; // null = ไม่มีตัวเลข (ยังโชว์การ์ด+deep-link ได้)
  airline: string | null;
  period: string | null;
  /** Google Flights deep-link — ทำงานเสมอแม้ไม่มีแหล่งราคา (ยังไม่ห่อ outbound) */
  searchUrl: string;
  source: string;
  available: boolean;
};

const CACHE_SECONDS = 60 * 60 * 6; // ราคาช่วงเดือนเปลี่ยนช้า
const FLI_TIMEOUT_MS = 2500; // สั้น — ห้าม block คำตอบ

// สนามบินญี่ปุ่นหลักตามภูมิภาคเมือง (เดา arrival airport จาก prefecture/เมือง)
const AIRPORT_BY_REGION: { test: RegExp; code: string; name: string }[] = [
  { test: /osaka|kyoto|kobe|nara|kansai|大阪|京都/i, code: "KIX", name: "คันไซ" },
  { test: /sapporo|hokkaido|札幌|北海道/i, code: "CTS", name: "ชิโตเสะ" },
  { test: /fukuoka|hakata|福岡/i, code: "FUK", name: "ฟุกุโอกะ" },
  { test: /okinawa|naha|沖縄|那覇/i, code: "OKA", name: "โอกินาว่า" },
  { test: /nagoya|aichi|名古屋|愛知/i, code: "NGO", name: "นาโกย่า" },
];

function pickAirport(cityName: string, prefecture?: string): { code: string; name: string } {
  const hay = `${cityName} ${prefecture ?? ""}`;
  return AIRPORT_BY_REGION.find((a) => a.test.test(hay)) ?? { code: "NRT", name: "นาริตะ (โตเกียว)" };
}

// Google Flights deep-link — round-trip BKK↔ปลายทาง (ไม่ผูกวันที่ = ให้ผู้ใช้เลือกต่อ)
function googleFlightsUrl(dest: string): string {
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(`flights from Bangkok to ${dest}`)}`;
}

export async function getFlightSignal(cityName: string, prefecture?: string, period?: string): Promise<FlightSignal> {
  const airport = pickAirport(cityName, prefecture);
  const route = `BKK → ${airport.code}`;
  const searchUrl = googleFlightsUrl(`${airport.name} ${airport.code}`);

  // ฐาน: การ์ดที่ทำงานได้เสมอแม้ไม่มีแหล่งราคา (deep-link ซื่อสัตย์)
  const base: FlightSignal = {
    route,
    priceThb: null,
    airline: null,
    period: period ?? null,
    searchUrl,
    source: "Google Flights",
    available: true,
  };

  const fliUrl = process.env.FLI_API_URL;
  if (!fliUrl) return base; // ไม่มีแหล่งราคา → คืนฐาน (มี deep-link, ไม่มีตัวเลข)

  // มีแหล่งราคา → ลองดึง แต่ล้มเงียบ (timeout สั้น, error → คืนฐาน)
  return cached(`flight:${airport.code}:${period ?? "any"}`, CACHE_SECONDS, async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FLI_TIMEOUT_MS);
      const url = new URL(fliUrl);
      url.searchParams.set("from", "BKK");
      url.searchParams.set("to", airport.code);
      if (period) url.searchParams.set("period", period);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: process.env.FLI_API_KEY ? { Authorization: `Bearer ${process.env.FLI_API_KEY}` } : undefined,
        next: { revalidate: CACHE_SECONDS },
      }).finally(() => clearTimeout(timer));

      if (!response.ok) return base;
      const data = (await response.json()) as { priceThb?: number; airline?: string };
      if (typeof data.priceThb !== "number") return base;

      return {
        ...base,
        priceThb: Math.round(data.priceThb),
        airline: data.airline ?? null,
        source: "fli",
      };
    } catch {
      return base; // timeout/network/parse → ฐาน (ซื่อสัตย์: ไม่มีตัวเลข ให้ deep-link)
    }
  });
}
