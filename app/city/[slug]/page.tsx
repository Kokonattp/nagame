import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TravelDashboard } from "@/components/travel-dashboard";
import { CityShell } from "@/components/city-shell";
import { japanMajorCities } from "@/lib/cities/japan-major-cities";
import { getCityConfigBySlug } from "@/lib/cities/city-configs";
import { recommendationsToPois } from "@/lib/cities/recommendations-to-pois";
import { getCityMeta, getRecommendationSets } from "@/lib/cities/travel-meta";
import type { Recommendation } from "@/lib/cities/city-configs";
import { getCityVerdict } from "@/lib/services/advisor";
import { getAqi } from "@/lib/services/aqi";
import { getCityHeroImagesBulk, getPlaceImages } from "@/lib/services/city-images";
import { resolveCity } from "@/lib/services/geocode";
import { getWarnings } from "@/lib/services/warnings";
import { getWebcams } from "@/lib/services/webcams";
import { getWeather } from "@/lib/services/weather";

// 10 นาที — ให้ประกาศเตือนภัย JMA และข่าวใน feed ตามทันเหตุการณ์
export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const city = await resolveCity(slug);
  if (!city) return {};

  const title = `${city.name}${city.japaneseName ? ` ${city.japaneseName}` : ""} | Nagame`;
  const description = `เช็คอากาศ ฝุ่น กล้องสด อีเวนต์ และแผนเที่ยว ${city.name} แบบเรียลไทม์ก่อนออกเดินทาง`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "Nagame",
      type: "website",
      locale: "th_TH",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const city = await resolveCity(slug);

  if (!city) notFound();

  if (city.slug !== slug) {
    redirect(`/city/${city.slug}`);
  }

  const config = getCityConfigBySlug(city.slug);
  // ยิงเฉพาะของที่หน้านี้แสดงจริง — events/quakes/fx เคยยิงแล้วส่งเข้า TravelDashboard
  // แต่ถูกรื้อออกจาก UI ไปก่อนหน้า เหลือ fetch ค้าง = จ่าย network + quota ทุก request ฟรี ๆ
  // service ยังอยู่ครบ (lib/services/*) — Phase 2 ที่ทำ warning/fx card เรียกกลับมาได้ทันที
  const [weather, aqi, webcam, warnings, verdict] = await Promise.all([
    getWeather(city.lat, city.lon),
    getAqi(city.lat, city.lon),
    getWebcams(city.lat, city.lon, config),
    getWarnings({ slug: city.slug, prefecture: city.prefecture }),
    getCityVerdict(city.slug),
  ]);

  const cityMetaBase = getCityMeta(city.slug, city.name);
  const heroImages = await getCityHeroImagesBulk(
    cityMetaBase.heroImage
      ? []
      : [{ slug: city.slug, name: city.name, prefecture: city.prefecture, japaneseName: city.japaneseName }],
  );
  const cityMeta = {
    ...cityMetaBase,
    heroImage: cityMetaBase.heroImage ?? heroImages.get(city.slug) ?? undefined,
  };
  const recommendationsBase = getRecommendationSets(city.name, city.prefecture, config?.recommendations ?? []);
  const recommendations = await attachPlaceImages(recommendationsBase, city.name);
  // หมุดบนแผนที่ washi = ที่กร๊วกแนะ ปักระดับย่าน (ก้าว G) — กันแผนที่ว่างเปล่า
  const mapPois = recommendationsToPois(recommendations, [city.lat, city.lon]);

  return (
    <CityShell
      city={{
        slug: city.slug,
        name: city.name,
        japaneseName: city.japaneseName,
        lat: city.lat,
        lon: city.lon,
      }}
      pois={mapPois}
    >
      <TravelDashboard
        key={city.slug}
        city={city}
        cityMeta={cityMeta}
        weather={weather}
        aqi={aqi}
        webcam={webcam}
        warnings={warnings}
        verdict={verdict}
        recommendations={recommendations}
        seeds={japanMajorCities}
      />
    </CityShell>
  );
}

async function attachPlaceImages(
  sets: {
    see: Recommendation[];
    eat: Recommendation[];
    sleep: Recommendation[];
    shop: Recommendation[];
    do: Recommendation[];
  },
  cityName: string,
) {
  const kinds = ["see", "eat", "sleep", "shop", "do"] as const;
  const allItems = kinds.flatMap((kind) => sets[kind]);

  // ค้นรูปเฉพาะสถานที่จริง — รายการ generic เป็นชื่อสมมุติ ค้นไปก็ได้รูปไม่ตรง
  const lookupItems = allItems.filter((item) => !item.generic);
  // ตอน server render ข้ามรอบสอง fuzzy (สูงสุด 10 call เว้น 300ms) ไม่ให้รูปการ์ด
  // ที่เป็น "nice to have" มา block การโหลดหน้า — รอบแรก batch 1 call ยังทำงาน
  const images = await getPlaceImages(
    cityName,
    lookupItems.map((item) => ({ title: item.title, area: item.area })),
    { skipFuzzyFallback: true },
  );
  const imageByItem = new Map(lookupItems.map((item, index) => [item, images[index]]));
  const enriched = allItems.map((item) => ({ ...item, image: imageByItem.get(item) ?? null }));

  const result = {} as Record<(typeof kinds)[number], (Recommendation & { image: string | null })[]>;
  let offset = 0;
  for (const kind of kinds) {
    result[kind] = enriched.slice(offset, offset + sets[kind].length);
    offset += sets[kind].length;
  }
  return result;
}
