import { ImageResponse } from "next/og";

export const alt = "Nagame — Japan travel companion with live weather, webcams, and AI trip planning";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const signals = ["Weather", "Air quality", "Webcams", "Events", "AI insight"];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundColor: "#f6f1e8",
          backgroundImage: "linear-gradient(135deg, #f8f5ef 0%, #f1e9db 55%, #e9ddc8 100%)",
          color: "#232830",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              width: 18,
              height: 18,
              borderRadius: 9999,
              backgroundColor: "#cda47f",
            }}
          />
          <div style={{ display: "flex", fontSize: 28, letterSpacing: 10, textTransform: "uppercase", color: "#6f6757" }}>
            Nagame
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 700, lineHeight: 1.05 }}>
            Japan, one calm view
          </div>
          <div style={{ display: "flex", fontSize: 34, color: "#5d564a", lineHeight: 1.35 }}>
            Live travel signals for 41 cities — plan the day, not just the trip.
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {signals.map((signal) => (
            <div
              key={signal}
              style={{
                display: "flex",
                padding: "14px 26px",
                borderRadius: 9999,
                border: "2px solid rgba(35,40,48,0.18)",
                backgroundColor: "rgba(255,253,250,0.85)",
                fontSize: 24,
                color: "#232830",
              }}
            >
              {signal}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
