"use client";

// CityShell — ครอบหน้าเมืองจริง (/city/[slug]) ด้วย AppShell โหมด "tabs".
// ตาม [[nagame-v2-direction]] + แผน Fable (agent a3e39cabe05d3a18f):
//  - แชท = TravelDashboard เดิมทั้งก้อน (แก้ 0 บรรทัด, ส่งผ่านเป็น children)
//  - map/book/trip = แท็บเต็มจอ, รับพิกัด/slug เมืองจริง
//  - shell = ค่าเริ่มต้นแล้ว (verify prod: chunk servable + CityShell marker ใน HTML).
//    gate อ่านฝั่ง client (ไม่แตะ searchParams ใน server page → ISR ยังอยู่).
//    ทางถอย = ?shell=0 → คืน dashboard เดิมล้วน (kill switch หนึ่ง release ถ้าเจอบั๊ก browser)

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/app-shell";
import { getAreaCoord } from "@/lib/cities/area-coords";
import type { MapPoi, ManholePin } from "@/components/map/washi-map";
import { getManholeSpots } from "@/lib/game/manhole-spots";
import { getCityStamps } from "@/lib/game/journal";

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
const TripPanel = dynamic(() => import("@/components/trip/trip-panel").then((m) => m.TripPanel), {
  ssr: false,
});

function CityShellInner({ city, pois, children }: { city: CityLite; pois: MapPoi[]; children: ReactNode }) {
  const params = useSearchParams();

  // หมุดฝาท่อ = spots ต่อเมือง + สถานะเก็บจาก journal (localStorage → อ่าน client เท่านั้น).
  // hook ต้องอยู่ก่อน early return ด้านล่างเสมอ (React hook rules — ห้ามอยู่หลัง conditional)
  const [manholes, setManholes] = useState<ManholePin[]>([]);
  useEffect(() => {
    const stamps = getCityStamps(city.slug);
    setManholes(
      getManholeSpots(city.slug).map((s) => ({
        key: s.key,
        lat: s.lat,
        lon: s.lon,
        place: s.place,
        collected: Boolean(stamps[s.key]),
      })),
    );
  }, [city.slug]);

  // shell = ค่าเริ่มต้น. ทางถอย ?shell=0 → คืน dashboard เดิมล้วน (kill switch)
  if (params.get("shell") === "0") return <>{children}</>;

  // ?area= = ย่านที่แชทส่งมาให้แผนที่โฟกัส (แชท = router). ไม่พบ → ไม่โฟกัส (null)
  const area = params.get("area") ?? undefined;
  const [flat, flon] = getAreaCoord(area, [city.lat, city.lon]);
  const focus = area ? { lat: flat, lon: flon, label: area } : null;

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
          key={`map-${manholes.length}`} // remount เมื่อฝาท่อโหลดจาก localStorage เสร็จ (สร้าง marker ครั้งเดียว/mount)
          center={[city.lat, city.lon]}
          zoom={14}
          kruak={{ lat: city.lat, lon: city.lon, mood: "sunny", say: "แถวนี้เดินเที่ยวได้เลยครับ 🐾" }}
          pois={pois}
          focus={focus}
          manholes={manholes}
        />
      }
      book={<ManholeBook citySlug={city.slug} cityName={city.name} />}
      trip={<TripPanel citySlug={city.slug} cityName={city.name} />}
    />
  );
}

export function CityShell({ city, pois = [], children }: { city: CityLite; pois?: MapPoi[]; children: ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <CityShellInner city={city} pois={pois}>
        {children}
      </CityShellInner>
    </Suspense>
  );
}
