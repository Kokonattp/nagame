"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Polyline, CircleMarker } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CityTransit } from "@/lib/cities/transit";

export function TransitMap({
  transit,
  selectedLineId,
  onSelect,
}: {
  transit: CityTransit;
  selectedLineId: string | null;
  onSelect: (lineId: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const linesRef = useRef<Map<string, Polyline>>(new Map());
  const stopsRef = useRef<Map<string, CircleMarker[]>>(new Map());
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
      }).setView([transit.station.lat, transit.station.lon], 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
      }).addTo(map);

      for (const line of transit.lines) {
        const latLngs = line.stops.map((stop) => [stop.lat, stop.lon] as [number, number]);
        const polyline = L.polyline(latLngs, {
          color: line.color,
          weight: 4,
          opacity: 0.85,
          dashArray: line.kind === "bus" ? "8 8" : undefined,
        })
          .addTo(map)
          .bindTooltip(line.name, { sticky: true });
        polyline.on("click", () => onSelectRef.current(line.id));
        linesRef.current.set(line.id, polyline);

        const markers = line.stops.map((stop) =>
          L.circleMarker([stop.lat, stop.lon], {
            radius: 5,
            weight: 2,
            color: line.color,
            fillColor: "#fffdf9",
            fillOpacity: 1,
          })
            .addTo(map)
            .bindTooltip(stop.name, { direction: "top", offset: L.point(0, -6) }),
        );
        stopsRef.current.set(line.id, markers);
      }

      // หมุดสถานีหลักวางทับเส้นทุกสายให้เห็นชัดว่าจุดเริ่มอยู่ตรงไหน
      L.circleMarker([transit.station.lat, transit.station.lon], {
        radius: 11,
        weight: 3,
        color: "#232830",
        fillColor: "#cda47f",
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip(`${transit.station.name}${transit.station.nameJa ? ` ${transit.station.nameJa}` : ""}`, {
          direction: "top",
          offset: L.point(0, -10),
          permanent: false,
        });

      const allPoints = transit.lines.flatMap((line) =>
        line.stops.map((stop) => [stop.lat, stop.lon] as [number, number]),
      );
      if (allPoints.length > 1) {
        map.fitBounds(L.latLngBounds(allPoints), { padding: [24, 24] });
      }

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      linesRef.current = new Map();
      stopsRef.current = new Map();
    };
  }, [transit]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const line of transit.lines) {
      const polyline = linesRef.current.get(line.id);
      const dimmed = selectedLineId !== null && selectedLineId !== line.id;
      polyline?.setStyle({
        opacity: dimmed ? 0.18 : 0.9,
        weight: selectedLineId === line.id ? 6 : 4,
      });
      for (const marker of stopsRef.current.get(line.id) ?? []) {
        marker.setStyle({ opacity: dimmed ? 0.15 : 1, fillOpacity: dimmed ? 0.15 : 1 });
      }
    }

    const selected = transit.lines.find((line) => line.id === selectedLineId);
    if (selected) {
      const bounds = selected.stops.map((stop) => [stop.lat, stop.lon] as [number, number]);
      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [32, 32] });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLineId]);

  return <div ref={containerRef} className="h-full w-full" />;
}
