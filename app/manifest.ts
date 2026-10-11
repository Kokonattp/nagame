import type { MetadataRoute } from "next";

// "Add to home screen": Nagame opens like an app, and saved trips work offline (public/sw.js).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nagame — วางทริปญี่ปุ่นกับทาบิ",
    short_name: "Nagame",
    description: "คุยกับทาบิ แมวผู้ช่วยวางทริปญี่ปุ่น แล้วได้เส้นทางและร่างทริปรายวัน",
    start_url: "/",
    display: "standalone",
    background_color: "#f7fbff",
    theme_color: "#f7fbff",
    lang: "th",
    icons: [
      { src: "/tabi/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/tabi/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
