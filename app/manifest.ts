import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nagame 眺め",
    short_name: "Nagame",
    description: "Live travel signals for Fukuoka.",
    start_url: "/city/fukuoka",
    display: "standalone",
    background_color: "#080b18",
    theme_color: "#080b18",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
