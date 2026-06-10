import { ImageResponse } from "next/og";
import { loadNotoSerifJP } from "@/lib/og-font";

export const alt = "Nagame 眺め — Japan travel companion with live weather, webcams, and AI trip planning";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const TITLE_JP = "眺め";
const BRAND = "NAGAME · JAPAN TRAVEL COMPANION";
const TAGLINE = "Japan, one calm view";
const SUBTITLE = "Live weather, webcams & AI travel signals across 41 cities";

export default async function OpenGraphImage() {
  const font = await loadNotoSerifJP(`${TITLE_JP}${BRAND}${TAGLINE}${SUBTITLE}`);

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
            right: -70,
            top: 64,
            width: 430,
            height: 430,
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

        <div style={{ display: "flex", flexDirection: "column", padding: "72px 90px" }}>
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 12, color: "#8a8172" }}>{BRAND}</div>
          <div style={{ display: "flex", fontSize: 178, color: "#262d36", lineHeight: 1.08 }}>{font ? TITLE_JP : "NAGAME"}</div>
          <div style={{ display: "flex", fontSize: 46, color: "#262d36", marginTop: 4 }}>{TAGLINE}</div>
          <div style={{ display: "flex", fontSize: 27, color: "#6f675a", marginTop: 14 }}>{SUBTITLE}</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: "NotoSerifJP", data: font, weight: 600 as const, style: "normal" as const }] : undefined,
    },
  );
}
