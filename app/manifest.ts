import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nagame 眺め — Japan Travel Companion",
    short_name: "Nagame",
    description: "เช็คอากาศ ฝุ่น กล้องสด อีเวนต์ แผ่นดินไหว และวางแผนเที่ยวญี่ปุ่นด้วย AI ครบในแอปเดียว",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f5ef",
    theme_color: "#f8f5ef",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
