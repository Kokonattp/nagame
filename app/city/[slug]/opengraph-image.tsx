import { ImageResponse } from "next/og";
import { getCityConfigBySlug } from "@/lib/cities/city-configs";
import { findJapanCitySeed } from "@/lib/cities/japan-major-cities";
import { loadNotoSerifJP } from "@/lib/og-font";
import { toTitleCase } from "@/lib/utils/format";

export const alt = "Nagame 眺め — city travel signals: live weather, webcams, and AI trip planning";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const STAMP = "眺";
const BRAND = "NAGAME · JAPAN TRAVEL COMPANION";
const SUBTITLE = "Today's travel signals — weather · air · webcams · events";

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const city = getCityConfigBySlug(slug) ?? findJapanCitySeed(slug);
  const cityName = city?.name ?? toTitleCase(slug.replace(/-/g, " "));
  const japaneseName = city?.japaneseName ?? "";
  const region = city?.prefecture && city.prefecture !== cityName ? `${city.prefecture}, Japan` : "Japan";

  const font = await loadNotoSerifJP(`${STAMP}${BRAND}${SUBTITLE}${cityName}${japaneseName}${region}`);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#f5efe3",
          fontFamily: font ? "NotoSerifJP" : "serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -60,
            top: 56,
            width: 340,
            height: 340,
            borderRadius: 9999,
            backgroundColor: "#cf3a2b",
            display: "flex",
          }}
        />

        <svg width="1200" height="250" viewBox="0 0 1200 250" style={{ position: "absolute", bottom: 0, left: 0 }}>
          <path
            d="M0 250 L0 218 C 150 210 270 160 420 96 C 458 80 492 80 528 102 L 596 142 L 650 114 C 686 96 718 100 762 124 C 900 192 1060 212 1200 218 L 1200 250 Z"
            fill="#262d36"
          />
          <path
            d="M0 250 L0 232 C 220 226 420 204 640 168 C 860 204 1020 226 1200 232 L 1200 250 Z"
            fill="#3c4554"
            opacity="0.55"
          />
        </svg>

        <div
          style={{
            position: "absolute",
            top: 26,
            left: 26,
            right: 26,
            bottom: 26,
            border: "2px solid rgba(38,45,54,0.15)",
            borderRadius: 8,
            display: "flex",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", padding: "70px 90px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {font ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  backgroundColor: "#cf3a2b",
                  color: "#f8f3ea",
                  fontSize: 38,
                }}
              >
                {STAMP}
              </div>
            ) : null}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 22, letterSpacing: 10, color: "#8a8172" }}>{BRAND}</div>
              <div style={{ display: "flex", fontSize: 24, color: "#6f675a", marginTop: 6 }}>{region}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 28, marginTop: 44 }}>
            <div style={{ display: "flex", fontSize: 124, color: "#262d36", lineHeight: 1.05 }}>{cityName}</div>
            {font && japaneseName ? (
              <div style={{ display: "flex", fontSize: 64, color: "#cf3a2b", lineHeight: 1.3 }}>{japaneseName}</div>
            ) : null}
          </div>

          <div style={{ display: "flex", fontSize: 28, color: "#6f675a", marginTop: 22 }}>{SUBTITLE}</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: "NotoSerifJP", data: font, weight: 600 as const, style: "normal" as const }] : undefined,
    },
  );
}
