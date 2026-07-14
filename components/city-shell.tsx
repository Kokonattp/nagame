"use client";

// CityShell — ครอบหน้าเมืองจริง (/city/[slug]) ด้วย AppShell โหมด "tabs".
// ตาม [[nagame-v2-direction]] + แผน Fable (agent a3e39cabe05d3a18f):
//  - แชท = TravelDashboard เดิมทั้งก้อน (แก้ 0 บรรทัด, ส่งผ่านเป็น children)
//  - map/book/trip = แท็บเต็มจอ, รับพิกัด/slug เมืองจริง
//  - gate ด้วย ?shell=1 อ่านฝั่ง client (ไม่แตะ searchParams ใน server page → ISR ยังอยู่)
//    ไม่มี shell=1 = คืน dashboard เดิมล้วน (kill switch หนึ่ง release)

import { Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/app-shell";

export type CityLite = {
  slug: string;
  name: string;
  japaneseName?: string;
  lat: number;
  lon: number;
};

const WashiMap = dynamic(() => import("@/components/map/washi-map").then((m) => m.WashiMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-[var(--ink-muted)]">
      กำลังโหลดแผนที่…
    </div>
  ),
});
const ManholeBook = dynamic(() => import("@/components/book/manhole-book").then((m) => m.ManholeBook), {
  ssr: false,
});

function TripStub({ cityName }: { cityName: string }) {
  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="text-5xl" aria-hidden>
        🧳
      </div>
      <h2 className="font-serif text-2xl">ทริป {cityName}</h2>
      <p className="max-w-[40ch] text-sm leading-6 text-[var(--ink-muted)]">
        สิ่งที่คุยกับกร๊วกจะมากองที่นี่ — ตั๋วบิน ที่พักที่จองแล้ว ย่านที่จะไป
        และฝาท่อที่ยังเก็บได้ (ก้าวถัดไป)
      </p>
    </div>
  );
}

function CityShellInner({ city, children }: { city: CityLite; children: ReactNode }) {
  const params = useSearchParams();
  // ยังไม่เปิด shell → คืน dashboard เดิมล้วน (ปลอดภัย, เป็น kill switch)
  if (params.get("shell") !== "1") return <>{children}</>;

  return (
    <AppShell
      layout="tabs"
      title={
        <span>
          {city.name} {city.japaneseName ?? ""}
        </span>
      }
      chat={children}
      map={
        <WashiMap
          center={[city.lat, city.lon]}
          zoom={14}
          kruak={{ lat: city.lat, lon: city.lon, mood: "sunny", say: "แถวนี้เดินเที่ยวได้เลยครับ 🐾" }}
          pois={[]}
        />
      }
      book={<ManholeBook citySlug={city.slug} cityName={city.name} />}
      trip={<TripStub cityName={city.name} />}
    />
  );
}

export function CityShell({ city, children }: { city: CityLite; children: ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <CityShellInner city={city}>{children}</CityShellInner>
    </Suspense>
  );
}
