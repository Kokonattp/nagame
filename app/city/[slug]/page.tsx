import { notFound, redirect } from "next/navigation";
import { TravelDashboard } from "@/components/travel-dashboard";
import { japanMajorCities } from "@/lib/cities/japan-major-cities";
import { getCityConfigBySlug } from "@/lib/cities/city-configs";
import { getCityMeta, getNearbyCities, getRecommendationSets } from "@/lib/cities/travel-meta";
import { getAqi } from "@/lib/services/aqi";
import { getEvents } from "@/lib/services/events";
import { resolveCity } from "@/lib/services/geocode";
import { getWebcams } from "@/lib/services/webcams";
import { getWeather } from "@/lib/services/weather";

export const revalidate = 1800;

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

  const cityMeta = getCityMeta(city.slug, city.name);
  const nearbyCities = getNearbyCities(city.slug, city.lat, city.lon, 6);
  const recommendations = getRecommendationSets(city.name, city.prefecture, config?.recommendations ?? []);

  return (
    <TravelDashboard
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
