import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prompt } from "@/components/tabi/fonts";
import { TabiApp } from "@/components/tabi/tabi-app";
import { buildSharedTrip } from "@/lib/tabi/share-server";

// /t/<code> — a trip a friend shared. The code holds only cities, nights, month/dates and
// place ids; the plan is rebuilt from server data (lib/tabi/share-server.ts).

type Props = { params: Promise<{ code: string }> };
const OG_IMAGE = "/opengraph-image.png";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const shared = buildSharedTrip((await params).code);
  if (!shared) return { title: "ไม่พบทริปนี้ · Nagame" };
  const stops = shared.route.stops.map((s) => s.cityTh).join(" → ");
  const title = `ทริป ${stops} ${shared.itinerary.length} วัน · ทาบิจัดให้`;
  const description = `แผนเที่ยวญี่ปุ่นรายวัน ${stops} พร้อมเวลาเดินทาง เปิดดูแล้วปรับต่อกับทาบิได้เลย`;
  return {
    title,
    description,
    // a page that sets its own openGraph drops the inherited share image, so name it again
    openGraph: { title, description, siteName: "Nagame", type: "website", locale: "th_TH", images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE] },
    robots: { index: false }, // personal plans: shareable, not search results
  };
}

export default async function SharedTripPage({ params }: Props) {
  const shared = buildSharedTrip((await params).code);
  if (!shared) notFound();
  return (
    <div className={prompt.variable}>
      <TabiApp shared={shared} />
    </div>
  );
}
