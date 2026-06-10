import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TravelDashboard } from "@/components/travel-dashboard";
import { japanMajorCities } from "@/lib/cities/japan-major-cities";
import { getCityConfigBySlug } from "@/lib/cities/city-configs";
import { getCityMeta, getNearbyCities, getRecommendationSets } from "@/lib/cities/travel-meta";
import type { Recommendation } from "@/lib/cities/city-configs";
import { getAqi } from "@/lib/services/aqi";
import { getCityHeroImagesBulk, getPlaceImages } from "@/lib/services/city-images";
import { getEvents } from "@/lib/services/events";
import { resolveCity } from "@/lib/services/geocode";
import { getWebcams } from "@/lib/services/webcams";
import { getWeather } from "@/lib/services/weather";

export const revalidate = 1800;

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
  const [weather, aqi, webcam, events] = await Promise.all([
    getWeather(city.lat, city.lon),
    getAqi(city.lat, city.lon),
    getWebcams(city.lat, city.lon, config),
    getEvents(config),
  ]);

  const cityMetaBase = getCityMeta(city.slug, city.name);
  const nearbyBase = getNearbyCities(city.slug, city.lat, city.lon, 6);
  const heroImages = await getCityHeroImagesBulk([
    ...(cityMetaBase.heroImage
      ? []
      : [{ slug: city.slug, name: city.name, prefecture: city.prefecture, japaneseName: city.japaneseName }]),
    ...nearbyBase
      .filter((nearby) => !nearby.heroImage)
      .map((nearby) => ({
        slug: nearby.slug,
        name: nearby.name,
        prefecture: nearby.prefecture,
        japaneseName: nearby.japaneseName,
      })),
  ]);
  const cityMeta = {
    ...cityMetaBase,
    heroImage: cityMetaBase.heroImage ?? heroImages.get(city.slug) ?? undefined,
  };
  const nearbyCities = nearbyBase.map((nearby) => ({
    ...nearby,
    heroImage: nearby.heroImage ?? heroImages.get(nearby.slug) ?? undefined,
  }));
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
      nearbyCities={nearbyCities}
      recommendations={recommendations}
      seeds={japanMajorCities}
    />
  );
}

async function attachPlaceImages(
  sets: { see: Recommendation[]; eat: Recommendation[]; sleep: Recommendation[] },
  cityName: string,
) {
  const allItems = [...sets.see, ...sets.eat, ...sets.sleep];
  const images = await getPlaceImages(
    cityName,
    allItems.map((item) => ({ title: item.title, area: item.area })),
  );
  const enriched = allItems.map((item, index) => ({ ...item, image: images[index] }));

  const seeEnd = sets.see.length;
  const eatEnd = seeEnd + sets.eat.length;

  return {
    see: enriched.slice(0, seeEnd),
    eat: enriched.slice(seeEnd, eatEnd),
    sleep: enriched.slice(eatEnd),
  };
}
