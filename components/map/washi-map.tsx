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

export type ManholePin = {
  key: string;
  lat: number;
  lon: number;
  place: string;
  collected: boolean;
};

export type WashiMapProps = {
  center: [number, number];
  zoom?: number;
  pois: MapPoi[];
  /** ตำแหน่งกร๊วกบนแผนที่ + อารมณ์ตามอากาศ */
  kruak?: { lat: number; lon: number; mood: KruakArtKey; say?: string };
  /** ย่านที่แชทส่งมาให้โฟกัส (?area=) → แผนที่ flyTo + ปักหมุดไฮไลต์ ไม่ remount */
  focus?: { lat: number; lon: number; label: string } | null;
  /** จุดฝาท่อ 御朱印 (ตรา) — เก็บแล้ว=สี, ยังไม่=ghost. กด→เปิดแท็บสมุด (?tab=book) */
  manholes?: ManholePin[];
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

// หมุดฝาท่อ 御朱印 — วงกลมลายท่อเล็ก. เก็บแล้ว=สีชาด+เงาแข็ง, ghost=เทาจาง.
// wrap ด้วย <a href="?tab=book"> → กดแล้วไปแท็บสมุด (URL = single source of truth,
// ไม่ต้อง callback ข้าม dynamic boundary). Leaflet ปล่อย click ผ่านไปที่ <a> ปกติ.
function manholeHtml(m: ManholePin): string {
  const ink = m.collected ? "#23282f" : "#9a958c";
  const fill = m.collected ? "var(--nb-vermilion)" : "var(--surface-soft)";
  const op = m.collected ? "1" : "0.72";
  const ribs = Array.from({ length: 12 })
    .map((_, i) => {
      const a = (i * Math.PI) / 6;
      return `<line x1="${(11 * Math.cos(a)).toFixed(1)}" y1="${(11 * Math.sin(a)).toFixed(1)}" x2="${(15 * Math.cos(a)).toFixed(1)}" y2="${(15 * Math.sin(a)).toFixed(1)}"/>`;
    })
    .join("");
  return `<a href="?tab=book" style="display:block;text-decoration:none;opacity:${op};filter:drop-shadow(2px 2px 0 rgba(43,40,36,.28));" title="ฝาท่อ: ${m.place}">
    <svg viewBox="-20 -20 40 40" width="34" height="34" xmlns="http://www.w3.org/2000/svg">
      <circle r="17" fill="${fill}" stroke="${ink}" stroke-width="2.5"/>
      <circle r="13" fill="none" stroke="${ink}" stroke-width="1.2" stroke-dasharray="2 2"/>
      <g stroke="${ink}" stroke-width="1" opacity="0.6">${ribs}</g>
      <text y="5" font-size="14" text-anchor="middle" fill="${ink}" stroke="none">🕳</text>
    </svg>
  </a>`;
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

export function WashiMap({ center, zoom = 14, pois, kruak, focus, manholes = [] }: WashiMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const focusMarkerRef = useRef<import("leaflet").Marker | null>(null);

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

      // หมุดฝาท่อ 御朱印 — วางบน landmark, กด→?tab=book. zIndex ต่ำกว่ากร๊วก สูงกว่า POI
      for (const m of manholes) {
        const icon = L.divIcon({
          html: manholeHtml(m),
          className: "",
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
        L.marker([m.lat, m.lon], { icon, zIndexOffset: 500 }).addTo(map);
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

  // แชทส่งย่านมา (?area=) → flyTo + ปักหมุดไฮไลต์ (ไม่ remount ทั้งแผนที่ = ลื่น)
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current;
      if (cancelled || !map) return;

      // ล้างหมุดโฟกัสเดิมก่อนเสมอ
      if (focusMarkerRef.current) {
        focusMarkerRef.current.remove();
        focusMarkerRef.current = null;
      }
      if (!focus) return;

      map.flyTo([focus.lat, focus.lon], Math.max(map.getZoom(), 15), { duration: 0.8 });
      const icon = L.divIcon({
        html: poiHtml({ id: "focus", kind: "stay", lat: focus.lat, lon: focus.lon, label: `📍 ${focus.label}`, selected: true }),
        className: "",
        iconSize: undefined as unknown as [number, number],
        iconAnchor: [0, 0],
      });
      focusMarkerRef.current = L.marker([focus.lat, focus.lon], { icon, zIndexOffset: 900 }).addTo(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [focus]);

  return <div ref={containerRef} className="h-full w-full" />;
}
