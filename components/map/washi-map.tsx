"use client";

// WashiMap — แผนที่ washi neo-brutalist calm สำหรับแท็บแผนที่ (ก้าว B).
// ใช้ Leaflet (มีในโปรเจกต์แล้ว) + OSM tiles ย้อมด้วย CSS filter ให้ออกโทน washi นุ่มตา
// (ไม่ใช้สีจัดแบบ CARTO). หมุดที่พัก/ร้าน = divIcon washi-tag (interactive = washi-UI ตาม
// design law), กร๊วก = หมุดตัวละครไม่ใช่จุดน้ำเงิน. deep-link นำทางออก Google Maps.
// ตาม [[nagame-v2-direction]] — nav ไม่สร้างเอง.

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { KRUAK_ART, type KruakArtKey } from "@/lib/game/kruak";

export type MapPoi = {
  id: string;
  kind: "stay" | "eat";
  lat: number;
  lon: number;
  label: string; // เช่น "฿1,180" หรือ "🍜 ราเมง"
  selected?: boolean;
};

export type WashiMapProps = {
  center: [number, number];
  zoom?: number;
  pois: MapPoi[];
  /** ตำแหน่งกร๊วกบนแผนที่ + อารมณ์ตามอากาศ */
  kruak?: { lat: number; lon: number; mood: KruakArtKey; say?: string };
};

// สไตล์หมุด washi-tag (สร้างเป็น HTML string ให้ Leaflet divIcon)
function poiHtml(p: MapPoi): string {
  const bg = p.selected ? "var(--nb-vermilion)" : p.kind === "eat" ? "var(--nb-matcha-soft)" : "var(--surface)";
  const color = p.selected ? "#fff" : "var(--nb-ink)";
  const radius = p.kind === "eat" ? "999px" : "5px";
  return `<div style="
    border:2px solid var(--nb-ink);background:${bg};color:${color};
    border-radius:${radius};padding:3px 8px;font-size:11px;font-weight:700;
    white-space:nowrap;box-shadow:2px 2px 0 0 var(--nb-ink);font-family:inherit;
  ">${p.label}</div>`;
}

function kruakHtml(mood: KruakArtKey, say?: string): string {
  const src = KRUAK_ART[mood].asset;
  const bubble = say
    ? `<div style="position:absolute;left:56px;top:0;width:150px;border:2px solid var(--nb-ink);
        background:var(--surface);box-shadow:2px 2px 0 0 var(--nb-ink);border-radius:3px 12px 12px 12px;
        padding:6px 9px;font-size:11px;font-weight:700;line-height:1.4;color:var(--nb-ink);">${say}</div>`
    : "";
  return `<div style="position:relative;">
    <img src="${src}" alt="กร๊วก" style="width:56px;height:56px;object-fit:contain;
      filter:drop-shadow(2px 3px 0 rgba(43,40,36,.22));" />
    ${bubble}
  </div>`;
}

export function WashiMap({ center, zoom = 14, pois, kruak }: WashiMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: false,
      }).setView(center, zoom);

      // OSM tiles — ย้อม washi ด้วย className (filter อยู่ใน globals ผ่าน .washi-tiles)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        className: "washi-tiles",
      }).addTo(map);

      for (const p of pois) {
        const icon = L.divIcon({
          html: poiHtml(p),
          className: "", // เลี่ยง default leaflet styling
          iconSize: undefined as unknown as [number, number],
          iconAnchor: [0, 0],
        });
        L.marker([p.lat, p.lon], { icon }).addTo(map);
      }

      if (kruak) {
        const icon = L.divIcon({
          html: kruakHtml(kruak.mood, kruak.say),
          className: "",
          iconSize: undefined as unknown as [number, number],
          iconAnchor: [28, 52],
        });
        L.marker([kruak.lat, kruak.lon], { icon, zIndexOffset: 1000 }).addTo(map);
      }

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // สร้างครั้งเดียวต่อ mount — center/pois เปลี่ยนจะ remount ทั้ง component (ก้าว B พอ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}
