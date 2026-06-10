"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, CircleMarker } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { WebcamOption } from "@/lib/services/webcams";

export function WebcamMap({
  options,
  selectedIndex,
  onSelect,
  cityLat,
  cityLon,
}: {
  options: WebcamOption[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  cityLat: number;
  cityLon: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<CircleMarker[]>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: false,
      }).setView([cityLat, cityLon], 12);

      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (mapboxToken) {
        L.tileLayer(
          `https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/512/{z}/{x}/{y}@2x?access_token=${mapboxToken}`,
          { maxZoom: 18, tileSize: 512, zoomOffset: -1 },
        ).addTo(map);
      } else {
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
        }).addTo(map);
      }

      const located = options
        .map((option, index) => ({ option, index }))
        .filter(({ option }) => typeof option.lat === "number" && typeof option.lon === "number");

      const markers = located.map(({ option, index }) => {
        const marker = L.circleMarker([option.lat!, option.lon!], {
          radius: 9,
          weight: 2,
          color: "#232830",
          fillColor: "#cda47f",
          fillOpacity: 0.9,
        })
          .addTo(map)
          .bindTooltip(option.title, { direction: "top", offset: L.point(0, -8) });

        marker.on("click", () => onSelectRef.current(index));
        return marker;
      });
      markersRef.current = options.map((_, index) => {
        const found = located.findIndex((item) => item.index === index);
        return markers[found];
      });

      if (located.length > 1) {
        map.fitBounds(
          L.latLngBounds(located.map(({ option }) => [option.lat!, option.lon!])),
          { padding: [28, 28] },
        );
      }

      mapRef.current = map;
      highlightSelected(selectedIndex);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
    // สร้างแผนที่ครั้งเดียวต่อชุดกล้อง — การเลือกถูกอัปเดตผ่าน effect ด้านล่าง
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, cityLat, cityLon]);

  function highlightSelected(index: number) {
    markersRef.current.forEach((marker, markerIndex) => {
      marker?.setStyle(
        markerIndex === index
          ? { fillColor: "#9c3d31", radius: 11 }
          : { fillColor: "#cda47f", radius: 9 },
      );
    });
  }

  useEffect(() => {
    highlightSelected(selectedIndex);
    const selected = options[selectedIndex];
    if (mapRef.current && typeof selected?.lat === "number" && typeof selected?.lon === "number") {
      mapRef.current.panTo([selected.lat, selected.lon]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex]);

  return <div ref={containerRef} className="h-full w-full" />;
}
