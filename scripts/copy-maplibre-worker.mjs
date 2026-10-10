// MapLibre v6 ships its web worker as a separate ES module that Next.js does not
// bundle. Copy it into public/ on every install (incl. Vercel builds) so the served
// worker always matches the installed maplibre-gl version. Used by components/tabi/tabi-map.tsx.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

const src = new URL("../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url);
const dir = new URL("../public/maplibre/", import.meta.url);
if (!existsSync(src)) {
  console.warn("[copy-maplibre-worker] maplibre-gl not installed; skipping");
} else {
  mkdirSync(dir, { recursive: true });
  copyFileSync(src, new URL("maplibre-gl-worker.mjs", dir));
  console.log("[copy-maplibre-worker] public/maplibre/maplibre-gl-worker.mjs updated");
}
