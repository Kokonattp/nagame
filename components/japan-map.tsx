import Link from "next/link";
import { MapPin } from "lucide-react";

const cities = [
  { name: "Sapporo", slug: "sapporo", x: 76, y: 12 },
  { name: "Tokyo", slug: "tokyo", x: 67, y: 58 },
  { name: "Yokohama", slug: "yokohama", x: 65, y: 61 },
  { name: "Nagoya", slug: "nagoya", x: 54, y: 62 },
  { name: "Kyoto", slug: "kyoto", x: 47, y: 62 },
  { name: "Osaka", slug: "osaka", x: 44, y: 66 },
  { name: "Hiroshima", slug: "hiroshima", x: 32, y: 69 },
  { name: "Fukuoka", slug: "fukuoka", x: 20, y: 78 },
  { name: "Naha", slug: "naha", x: 12, y: 92 },
];

export function JapanMap() {
  return (
    <section id="map" className="mx-4 rounded-[2rem] bg-zinc-950 p-4 text-white shadow-2xl shadow-zinc-950/20 lg:mx-0">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200/80">Japan map</p>
          <h2 className="text-2xl font-black">เลือกเมืองใหญ่</h2>
        </div>
        <MapPin className="h-6 w-6 text-cyan-200" aria-hidden />
      </div>
      <div className="relative h-[320px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_50%_30%,rgba(34,211,238,0.18),transparent_35%),linear-gradient(180deg,#10233d,#07111f)]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" role="img" aria-label="Stylized map of Japan">
          <path
            d="M72 7c7 8 9 18 5 28-3 7-1 12 5 19 5 6 5 12 0 18-4 6-12 5-17 1-6-5-10-5-16-2-8 4-18 7-27 3-8-4-8-12-2-17 5-4 13-5 20-10 9-6 12-16 10-27-1-8 4-17 12-18 4-1 7 1 10 5Z"
            fill="rgba(255,255,255,0.16)"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1.2"
          />
          <path
            d="M17 75c-5 3-8 8-6 13 2 4 8 5 12 2 5-3 7-9 4-13-2-3-6-4-10-2Z"
            fill="rgba(255,255,255,0.13)"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="1.1"
          />
          <path
            d="M69 7c5 8 8 17 5 27-2 7 1 13 6 19"
            fill="none"
            stroke="rgba(125,211,252,0.55)"
            strokeDasharray="2 3"
            strokeWidth="0.8"
          />
        </svg>

        {cities.map((city) => (
          <Link
            key={city.slug}
            href={`/city/${city.slug}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50 bg-white px-2.5 py-1.5 text-xs font-black text-zinc-950 shadow-lg shadow-cyan-950/30 transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-200"
            style={{ left: `${city.x}%`, top: `${city.y}%` }}
          >
            {city.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
