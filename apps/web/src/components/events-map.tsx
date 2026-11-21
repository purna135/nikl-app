"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap, Marker } from "mapbox-gl";
import { BBSR_CENTER, categoryById } from "@nikl/utils";

/** `stack` numbers events at the same spot (0, 1, 2…); later ones are fanned out in pixels around the first. */
export type MapPoint = { id: string; lat: number; lng: number; category: string; title: string; stack?: number };

function stackOffset(stack = 0): [number, number] {
  if (stack === 0) return [0, 0];
  const angle = ((stack - 1) * Math.PI) / 3 - Math.PI / 2;
  return [Math.round(30 * Math.cos(angle)), Math.round(30 * Math.sin(angle))];
}

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function styleFor(dark: boolean) {
  return dark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11";
}

/**
 * Bhubaneswar map with one pin per event. Mapbox loads only in the browser.
 * Pins are plain buttons, so they work with the keyboard and screen readers.
 */
export function EventsMap({
  points,
  selectedId,
  highlightId,
  onSelect,
}: {
  points: MapPoint[];
  /** Opened from a pin: the map pans to it. */
  selectedId: string | null;
  /** Hovered in the list (or selected): the pin is highlighted, the map stays put. */
  highlightId: string | null;
  onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const markers = useRef(new Map<string, { marker: Marker; el: HTMLButtonElement }>());
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(!TOKEN);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Create the map once
  useEffect(() => {
    if (!TOKEN || !container.current) return;
    let cancelled = false;
    const pins = markers.current;
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    import("mapbox-gl")
      .then(({ default: mapboxgl }) => {
        if (cancelled || !container.current) return;
        mapboxgl.accessToken = TOKEN;
        const m = new mapboxgl.Map({
          container: container.current,
          style: styleFor(dark),
          center: [BBSR_CENTER.lng, BBSR_CENTER.lat],
          zoom: 11.3,
          attributionControl: true,
          cooperativeGestures: false,
        });
        m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        let loaded = false;
        m.on("load", () => {
          loaded = true;
          if (!cancelled) setReady(true);
        });
        m.on("error", (e) => {
          console.warn("Map error:", e.error?.message);
          // A rejected token (wrong URL restriction, revoked) fails the style before it loads: show the fallback.
          const status = (e.error as { status?: number } | undefined)?.status;
          if (!loaded && !cancelled && (status === 401 || status === 403)) setFailed(true);
        });
        map.current = m;
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      pins.clear();
    };
  }, []);

  // Sync pins with the current list
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    let cancelled = false;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelled) return;
      const wanted = new Set(points.map((p) => p.id));
      for (const [id, { marker }] of markers.current) {
        if (!wanted.has(id)) {
          marker.remove();
          markers.current.delete(id);
        }
      }
      for (const p of points) {
        const existing = markers.current.get(p.id);
        if (existing) {
          existing.marker.setOffset(stackOffset(p.stack)); // filters can change who's first at a spot
          continue;
        }
        const el = document.createElement("button");
        el.type = "button";
        el.className = "map-pin";
        el.textContent = categoryById(p.category)?.emoji ?? "📍";
        el.setAttribute("aria-label", p.title);
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          onSelectRef.current(p.id);
        });
        const marker = new mapboxgl.Marker({ element: el, offset: stackOffset(p.stack) }).setLngLat([p.lng, p.lat]).addTo(m);
        markers.current.set(p.id, { marker, el });
      }
      if (points.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        for (const p of points) bounds.extend([p.lng, p.lat]);
        m.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 400 });
      } else if (points.length === 1) {
        m.easeTo({ center: [points[0]!.lng, points[0]!.lat], zoom: 14, duration: 400 });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [points, ready]);

  // Highlight the hovered / selected pin
  useEffect(() => {
    for (const [id, { el }] of markers.current) el.classList.toggle("selected", id === highlightId);
  }, [highlightId, points, ready]);

  // Pan to a pin opened from the map
  useEffect(() => {
    const sel = selectedId ? markers.current.get(selectedId) : undefined;
    if (sel && map.current) map.current.easeTo({ center: sel.marker.getLngLat(), duration: 300 });
  }, [selectedId]);

  if (failed) {
    return (
      <div className="map-fallback">
        <p>The map isn&apos;t available right now. The list shows every event.</p>
      </div>
    );
  }
  return <div ref={container} className="events-map" role="region" aria-label="Map of events in Bhubaneswar" />;
}
