import Link from "next/link";
import { MapPin } from "lucide-react";

const cities = [
  { name: "Sapporo", slug: "sapporo", x: 70, y: 20 },
  { name: "Tokyo", slug: "tokyo", x: 68, y: 61 },
  { name: "Yokohama", slug: "yokohama", x: 66, y: 65 },
  { name: "Nagoya", slug: "nagoya", x: 56, y: 65 },
  { name: "Kyoto", slug: "kyoto", x: 49, y: 66 },
  { name: "Osaka", slug: "osaka", x: 46, y: 70 },
  { name: "Hiroshima", slug: "hiroshima", x: 35, y: 72 },
  { name: "Fukuoka", slug: "fukuoka", x: 25, y: 78 },
  { name: "Naha", slug: "naha", x: 17, y: 90 },
];

export function JapanMap() {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapImage = mapboxToken
    ? `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/138.2529,36.2048,4.15,0/960x640@2x?access_token=${mapboxToken}`
    : "https://staticmap.openstreetmap.de/staticmap.php?center=36.2048,138.2529&zoom=5&size=960x640&maptype=mapnik";

  return (
    <section id="map" className="mx-4 rounded-[2rem] bg-zinc-950 p-4 text-white shadow-2xl shadow-zinc-950/20 lg:mx-0">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200/80">Japan map</p>
          <h2 className="text-2xl font-black">เลือกเมืองใหญ่</h2>
        </div>
        <MapPin className="h-6 w-6 text-cyan-200" aria-hidden />
      </div>
      <div className="relative h-[360px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-900 lg:h-[420px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mapImage} alt="Japan map" className="absolute inset-0 h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-950/10 via-transparent to-zinc-950/35" />
        <div className="pointer-events-none absolute bottom-2 left-3 rounded-full bg-white/85 px-2 py-1 text-[10px] font-bold text-zinc-700">
          {mapboxToken ? "Mapbox" : "OpenStreetMap fallback"}
        </div>

        {cities.map((city) => (
          <Link
            key={city.slug}
            href={`/city/${city.slug}`}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 bg-white px-2.5 py-1.5 text-xs font-black text-zinc-950 shadow-lg shadow-cyan-950/30 transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-200"
            style={{ left: `${city.x}%`, top: `${city.y}%` }}
          >
            {city.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
