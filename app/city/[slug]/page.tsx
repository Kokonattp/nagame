import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TravelDashboard } from "@/components/travel-dashboard";
import { japanMajorCities } from "@/lib/cities/japan-major-cities";
import { getCityConfigBySlug } from "@/lib/cities/city-configs";
import { getCityMeta, getRecommendationSets } from "@/lib/cities/travel-meta";
import type { Recommendation } from "@/lib/cities/city-configs";
import { getCityVerdict } from "@/lib/services/advisor";
import { getAqi } from "@/lib/services/aqi";
import { getCityHeroImagesBulk, getPlaceImages } from "@/lib/services/city-images";
import { getEvents } from "@/lib/services/events";
import { getFx } from "@/lib/services/fx";
import { getQuakes } from "@/lib/services/quakes";
import { resolveCity } from "@/lib/services/geocode";
import { getWarnings } from "@/lib/services/warnings";
import { getWebcams } from "@/lib/services/webcams";
import { getWeather } from "@/lib/services/weather";
import { getCityTransit } from "@/lib/cities/transit";
import { getCityDrive } from "@/lib/cities/drive-spots";

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
  const [weather, aqi, webcam, events, quakes, fx, warnings, verdict] = await Promise.all([
    getWeather(city.lat, city.lon),
    getAqi(city.lat, city.lon),
    getWebcams(city.lat, city.lon, config),
    getEvents(config),
    getQuakes(city.lat, city.lon),
    getFx(),
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

  return (
    <TravelDashboard
      key={city.slug}
      city={city}
      cityMeta={cityMeta}
      weather={weather}
      aqi={aqi}
      webcam={webcam}
      events={events}
      quakes={quakes}
      fx={fx}
      warnings={warnings}
      verdict={verdict}
      transit={getCityTransit(city.slug)}
      drive={getCityDrive(city.slug)}
      recommendations={recommendations}
      seeds={japanMajorCities}
    />
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
  const images = await getPlaceImages(
    cityName,
    lookupItems.map((item) => ({ title: item.title, area: item.area })),
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
