"use client";

// Contextual map (spec §13): only the route, its stops and ≤3 suggestions — no POI clouds.
// MapLibre + OpenFreeMap (free, no key). The "positron" base is recoloured at load
// into the Tabi pastel palette, labels switched to English, road names hidden.

import { useEffect, useRef } from "react";
import type { GeoJSONSource, Map as MlMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type MapPoint = { lat: number; lon: number; label: string; kind: "stop" | "place" };

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

// layer id → paint overrides (pastel: sky water, mint parks, sakura-tinted towns)
const PASTEL: Record<string, Record<string, unknown>> = {
  background: { "background-color": "#f4f8ff" },
  water: { "fill-color": "#c9e4ff" },
  park: { "fill-color": "#e2f5e9", "fill-opacity": 0.9 },
  landcover_wood: { "fill-color": "#d9f0e1", "fill-opacity": 0.8 },
  landuse_residential: { "fill-color": "#fdf0f5", "fill-opacity": 0.8 },
  waterway: { "line-color": "#b7d9fb" },
};
const HIDE = /^(highway-name|highway-shield|road_shield|label_village|label_other|aeroway|building)/;

async function pastelStyle(): Promise<StyleSpecification> {
  const style = (await (await fetch(STYLE_URL)).json()) as StyleSpecification;
  style.layers = style.layers
    .filter((l) => !HIDE.test(l.id))
    .map((l) => {
      const paint = PASTEL[l.id];
      const next = paint ? { ...l, paint: { ...(("paint" in l && l.paint) || {}), ...paint } } : l;
      if (next.type === "symbol" && next.layout && "text-field" in next.layout) {
        // English first so Thai users can match names on the cards
        return { ...next, layout: { ...next.layout, "text-field": ["coalesce", ["get", "name:en"], ["get", "name_en"], ["get", "name"]] } } as typeof next;
      }
      return next;
    }) as StyleSpecification["layers"];
  return style;
}

let styleCache: Promise<StyleSpecification> | null = null;

export function TabiMap({ points, height = 220, interactive = true }: { points: MapPoint[]; height?: number; interactive?: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    (async () => {
      const maplibregl = await import("maplibre-gl");
      maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs"); // see scripts/copy-maplibre-worker.mjs
      styleCache ??= pastelStyle().catch((e) => { styleCache = null; throw e; });
      let style: StyleSpecification | string;
      try { style = await styleCache; } catch { style = STYLE_URL; }
      if (cancelled || !el.current) return;
      map.current?.remove();

      const stops = points.filter((p) => p.kind === "stop");
      // the line follows the real track/road between stops (loaded with the map, not the page)
      const { routeLine } = await import("@/lib/tabi/rail-shapes");
      if (cancelled || !el.current) return;
      const line = routeLine(stops.map((p) => ({ city: p.label, lon: p.lon, lat: p.lat })));
      const m = new maplibregl.Map({
        container: el.current,
        style,
        center: points[0] ? [points[0].lon, points[0].lat] : [138.2, 36.2],
        zoom: points.length ? 7 : 4.3,
        interactive,
        // route lines: 国土数値情報 鉄道データ (MLIT, CC BY 4.0) + OSRM roads on OpenStreetMap
        attributionControl: { compact: true, customAttribution: "Rail lines: 国土数値情報 (MLIT)" },
        cooperativeGestures: interactive, // one-finger scroll keeps scrolling the page
      });
      map.current = m;
      if (interactive) m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");

      m.on("load", () => {
        // our stop pills already name the city: hide the base map's own label for it (they overlapped)
        const names = stops.map((p) => p.label);
        for (const layer of m.getStyle().layers ?? []) {
          if (layer.type === "symbol" && /^label_(city|town)/.test(layer.id)) {
            const own = m.getFilter(layer.id);
            const notOurs = ["!", ["in", ["coalesce", ["get", "name:en"], ["get", "name_en"], ["get", "name"]], ["literal", names]]];
            m.setFilter(layer.id, (own ? ["all", own, notOurs] : notOurs) as Parameters<typeof m.setFilter>[1]);
          }
        }
        if (stops.length > 1) {
          const coords = line;
          const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          m.addSource("route", {
            type: "geojson",
            data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: reduce ? coords : coords.slice(0, 1).concat([coords[0]]) } },
          });
          // the route draws itself from the first stop, like a pen on the map (~1.4 s)
          if (!reduce) {
            const t0 = performance.now();
            const step = (t: number) => {
              if (cancelled) return;
              const k = Math.min(1, (t - t0) / 1400);
              (m.getSource("route") as GeoJSONSource | undefined)?.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: partialLine(coords, k) } });
              if (k < 1) raf = requestAnimationFrame(step);
            };
            raf = requestAnimationFrame(step);
          }
          m.addLayer({ id: "route-glow", type: "line", source: "route", paint: { "line-color": "#2d7ff9", "line-width": 8, "line-opacity": 0.18 }, layout: { "line-cap": "round", "line-join": "round" } });
          m.addLayer({ id: "route", type: "line", source: "route", paint: { "line-color": "#2d7ff9", "line-width": 3.5 }, layout: { "line-cap": "round", "line-join": "round" } });
        }
      });

      let n = 0;
      // places first: markers added later sit on top, so a nearby place dot never hides a stop number
      for (const p of [...points.filter((q) => q.kind === "place"), ...stops]) {
        const node = document.createElement("div");
        if (p.kind === "stop") {
          n++;
          node.innerHTML = `<div class="tabi-marker-pop" style="display:flex;align-items:center;gap:4px;animation-delay:${n * 350}ms"><span style="display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#1a66d9;color:#fff;font-weight:700;border:3px solid #fff;box-shadow:0 2px 6px rgba(12,31,74,.3)">${n}</span><span style="background:#fff;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;color:#0c1f4a;box-shadow:0 2px 6px rgba(12,31,74,.15);white-space:nowrap">${escapeHtml(p.label)}</span></div>`;
          new maplibregl.Marker({ element: node, anchor: "left", offset: [-14, 0] }).setLngLat([p.lon, p.lat]).addTo(m);
        } else {
          node.innerHTML = `<div title="${escapeHtml(p.label)}" style="width:18px;height:18px;border-radius:50%;background:#ff5c9d;border:3px solid #fff;box-shadow:0 2px 6px rgba(12,31,74,.3)"></div>`;
          new maplibregl.Marker({ element: node }).setLngLat([p.lon, p.lat]).addTo(m);
        }
      }
      if (points.length > 1) {
        const lons = points.map((p) => p.lon);
        const lats = points.map((p) => p.lat);
        m.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { padding: { top: 44, bottom: 56, left: 44, right: 120 }, maxZoom: 10, duration: 0 });
      }
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      map.current?.remove();
      map.current = null;
    };
  }, [points, interactive]);

  return <div ref={el} style={{ height }} className="tabi-map overflow-hidden rounded-[18px]" role="img" aria-label={`แผนที่: ${points.filter((p) => p.kind === "stop").map((p) => p.label).join(" → ")}`} />;
}

/** First `k` (0–1) of a polyline by length, ending at an interpolated point. */
function partialLine(coords: number[][], k: number): number[][] {
  if (k >= 1) return coords;
  const seg = coords.slice(1).map((c, i) => Math.hypot(c[0] - coords[i][0], c[1] - coords[i][1]));
  let left = seg.reduce((a, b) => a + b, 0) * k;
  const out = [coords[0]];
  for (let i = 0; i < seg.length; i++) {
    if (left >= seg[i]) { out.push(coords[i + 1]); left -= seg[i]; continue; }
    const f = seg[i] ? left / seg[i] : 0;
    out.push([coords[i][0] + (coords[i + 1][0] - coords[i][0]) * f, coords[i][1] + (coords[i + 1][1] - coords[i][1]) * f]);
    break;
  }
  return out.length > 1 ? out : [coords[0], coords[0]];
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
