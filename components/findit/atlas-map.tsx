"use client";

/**
 * FIND_IT.md §6: Leaflet map. Online base = OSM standard tiles (the only runtime request).
 * Offline base = plain ivory background, a schematic rail line through the stations and city labels.
 * No routing, no prefetching, no bundled tiles.
 */

import "leaflet/dist/leaflet.css";
import "./atlas.css";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { STATIONS, type OpportunityStatus } from "@/lib/findit/data";

export type MapPin = {
  id: string;
  name: string;
  status: OpportunityStatus;
  lat: number;
  lon: number;
};

const SHAPE: Record<OpportunityStatus, string> = {
  "For sale": "sale",
  "Planned or approved": "planned",
  "Potential site": "site",
};

/** Default view: San Juan Capistrano with Irvine Station in frame. */
const DEFAULT_BOUNDS: [[number, number], [number, number]] = [
  [33.41, -117.86],
  [33.67, -117.58],
];

const OSM_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const TILE_ERRORS_BEFORE_OFFLINE = 3;

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function AtlasMap({
  pins,
  selectedId,
  onSelect,
}: {
  pins: readonly MapPin[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const tilesRef = useRef<Leaflet.TileLayer | null>(null);
  const offlineLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const pinLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, Leaflet.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const [offlineReason, setOfflineReason] = useState<"auto" | "manual" | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Create the map once (client only; Leaflet touches window).
  useEffect(() => {
    let cancelled = false;
    let map: Leaflet.Map | null = null;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;
      LRef.current = L;
      map = L.map(containerRef.current, { zoomControl: true, keyboard: true, minZoom: 9, maxZoom: 18 });
      map.fitBounds(DEFAULT_BOUNDS);
      mapRef.current = map;

      const tiles = L.tileLayer(OSM_URL, { maxZoom: 19, attribution: OSM_ATTRIBUTION });
      let errors = 0;
      tiles.on("tileerror", () => {
        errors++;
        if (errors >= TILE_ERRORS_BEFORE_OFFLINE) {
          setOffline(true);
          setOfflineReason((r) => r ?? "auto");
        }
      });
      tilesRef.current = tiles;

      // Offline base: schematic rail line through the three stations, and city labels at the stations.
      const offlineLayer = L.layerGroup();
      const line = [...STATIONS].sort((a, b) => b.point.lat - a.point.lat).map((s) => [s.point.lat, s.point.lon] as [number, number]);
      L.polyline(line, { color: "#4b5d6b", weight: 2, dashArray: "6 6", interactive: false })
        .bindTooltip("Rail line (schematic, through stations)", { permanent: false, sticky: true })
        .addTo(offlineLayer);
      const cityLabels: [string, number, number][] = [
        ["Irvine", STATIONS[0]!.point.lat + 0.012, STATIONS[0]!.point.lon],
        ["San Juan Capistrano", STATIONS[1]!.point.lat + 0.012, STATIONS[1]!.point.lon],
        ["San Clemente", STATIONS[2]!.point.lat - 0.012, STATIONS[2]!.point.lon],
      ];
      for (const [name, lat, lon] of cityLabels) {
        L.marker([lat, lon], {
          interactive: false,
          keyboard: false,
          icon: L.divIcon({ className: "atlas-city-label", html: esc(name), iconSize: [160, 16], iconAnchor: [0, 8] }),
        }).addTo(offlineLayer);
      }
      offlineLayerRef.current = offlineLayer;

      // Stations: diamonds, labeled, not selectable as opportunities.
      for (const s of STATIONS) {
        const m = L.marker([s.point.lat, s.point.lon], {
          interactive: false,
          keyboard: false,
          icon: L.divIcon({
            className: "atlas-icon",
            html: `<span class="atlas-shape atlas-shape--station" aria-hidden="true"></span><span class="atlas-label atlas-label--station">${esc(s.name)}</span>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
        });
        m.addTo(map);
      }

      pinLayerRef.current = L.layerGroup().addTo(map);

      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setOffline(true);
        setOfflineReason("auto");
      }
      setReady(true);
      // Re-fit once layout has settled so the default view really shows SJC with Irvine Station.
      requestAnimationFrame(() => {
        if (!mapRef.current) return;
        mapRef.current.invalidateSize();
        mapRef.current.fitBounds(DEFAULT_BOUNDS);
      });
    })();
    const markers = markersRef.current;
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      markers.clear();
    };
  }, []);

  // Switch base layers.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !tilesRef.current || !offlineLayerRef.current) return;
    if (offline) {
      tilesRef.current.remove();
      offlineLayerRef.current.addTo(map);
      map.attributionControl.addAttribution("Offline base: pins, stations and schematic line only");
    } else {
      offlineLayerRef.current.remove();
      tilesRef.current.addTo(map);
      map.attributionControl.removeAttribution("Offline base: pins, stations and schematic line only");
    }
  }, [offline, ready]);

  useEffect(() => {
    const goOffline = () => {
      setOffline(true);
      setOfflineReason((r) => r ?? "auto");
    };
    window.addEventListener("offline", goOffline);
    return () => window.removeEventListener("offline", goOffline);
  }, []);

  // Draw opportunity pins.
  useEffect(() => {
    const L = LRef.current;
    const layer = pinLayerRef.current;
    if (!ready || !L || !layer) return;
    layer.clearLayers();
    markersRef.current.clear();
    for (const p of pins) {
      const label = `${p.name}, ${p.status}`;
      const selected = p.id === selectedId;
      const m = L.marker([p.lat, p.lon], {
        keyboard: true,
        title: label,
        alt: label,
        riseOnHover: true,
        zIndexOffset: selected ? 1000 : 0,
        icon: L.divIcon({
          className: `atlas-icon${selected ? " is-selected" : ""}`,
          html: `<span class="atlas-shape atlas-shape--${SHAPE[p.status]}" aria-hidden="true"></span><span class="atlas-label" aria-hidden="true">${esc(p.name)}</span>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
      });
      m.on("click", () => onSelectRef.current(p.id));
      m.addTo(layer);
      const el = m.getElement();
      if (el) {
        el.setAttribute("aria-label", label);
        el.setAttribute("aria-pressed", selected ? "true" : "false");
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelectRef.current(p.id);
          }
        });
      }
      markersRef.current.set(p.id, m);
    }
  }, [pins, selectedId, ready]);

  // Pan to the selected pin without hiding it.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !selectedId) return;
    const pin = pins.find((p) => p.id === selectedId);
    if (!pin) return;
    map.invalidateSize();
    const target = map.getZoom() < 12 ? 12 : map.getZoom();
    map.setView([pin.lat, pin.lon], target, { animate: true });
  }, [selectedId, pins, ready]);

  // Keep Leaflet's size in sync with layout changes (detail panel open/close, mobile).
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function resetView() {
    mapRef.current?.fitBounds(DEFAULT_BOUNDS);
  }

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className={`atlas-map h-full w-full${offline ? " atlas-offline" : ""}`}
        role="region"
        aria-label="Map of South Orange County opportunities. Use the list for the same information."
      />
      {offline && (
        <p
          role="status"
          className="absolute left-1/2 top-3 z-[500] -translate-x-1/2 rounded-md border border-[#d9ccb4] bg-[#fffdf8] px-3 py-1.5 text-center text-xs font-medium shadow-sm"
        >
          Offline: street map unavailable; pin positions are still to scale.
          {offlineReason === "manual" && " (Offline base chosen manually.)"}
        </p>
      )}
      <div className="absolute bottom-7 left-2 z-[500] flex flex-col gap-1.5">
        <button
          type="button"
          onClick={resetView}
          className="rounded-md border border-[#d9ccb4] bg-[#fffdf8] px-2.5 py-1 text-xs font-semibold shadow-sm hover:bg-[#f7f2e8]"
        >
          Reset view
        </button>
        <button
          type="button"
          aria-pressed={offline}
          onClick={() => {
            setOffline((o) => !o);
            setOfflineReason(offline ? null : "manual");
          }}
          className="rounded-md border border-[#d9ccb4] bg-[#fffdf8] px-2.5 py-1 text-xs font-semibold shadow-sm hover:bg-[#f7f2e8]"
        >
          {offline ? "Try street map" : "Use offline base"}
        </button>
      </div>
    </div>
  );
}

/** Legend shapes, reused by the list and the legend. */
export function PinShape({ status }: { status: OpportunityStatus | "Station" }) {
  const cls = status === "Station" ? "station" : SHAPE[status];
  return (
    <span className="relative inline-block h-[18px] w-[18px] shrink-0 align-middle" aria-hidden="true">
      <span className={`atlas-shape atlas-shape--${cls}`} />
    </span>
  );
}
