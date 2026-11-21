"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap, Marker } from "mapbox-gl";
import { AREA_CENTERS, BBSR_CENTER, type Area } from "@nikl/utils";

export type Pin = { lat: number; lng: number } | null;

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const round = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Tap the map to drop the venue pin; drag to adjust. Centres on the chosen area.
 * Optional: events without a pin still show in lists, just not on the map.
 */
export function PinPicker({ value, onChange, area }: { value: Pin; onChange: (pin: Pin) => void; area: string }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(!TOKEN);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!TOKEN || !container.current) return;
    let cancelled = false;
    import("mapbox-gl")
      .then(({ default: mapboxgl }) => {
        if (cancelled || !container.current) return;
        mapboxgl.accessToken = TOKEN;
        const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const m = new mapboxgl.Map({
          container: container.current,
          style: dark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12",
          center: [BBSR_CENTER.lng, BBSR_CENTER.lat],
          zoom: 11.5,
        });
        m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        const mk = new mapboxgl.Marker({ color: "#D81B60", draggable: true });
        mk.on("dragend", () => {
          const p = mk.getLngLat();
          onChangeRef.current({ lat: round(p.lat), lng: round(p.lng) });
        });
        m.on("click", (e) => onChangeRef.current({ lat: round(e.lngLat.lat), lng: round(e.lngLat.lng) }));
        let loaded = false;
        m.on("load", () => {
          loaded = true;
          if (!cancelled) setReady(true);
        });
        m.on("error", (e) => {
          const status = (e.error as { status?: number } | undefined)?.status;
          if (!loaded && !cancelled && (status === 401 || status === 403)) setFailed(true);
        });
        map.current = m;
        marker.current = mk;
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
  }, []);

  // Show / move / hide the marker
  useEffect(() => {
    const m = map.current;
    const mk = marker.current;
    if (!m || !mk || !ready) return;
    if (value) {
      mk.setLngLat([value.lng, value.lat]).addTo(m);
    } else {
      mk.remove();
    }
  }, [value, ready]);

  // Fly to the area when it changes and there's no pin yet
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || value) return;
    const c = AREA_CENTERS[area as Area];
    if (c) m.flyTo({ center: [c.lng, c.lat], zoom: 14, duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to area changes
  }, [area, ready]);

  if (failed) return <p className="hint">The map isn&apos;t available right now. You can add the pin later.</p>;
  return (
    <div className="pin-picker">
      <div ref={container} className="pin-map" role="application" aria-label="Map: tap where the event happens" />
      <div className="actions-row">
        <span className="hint" style={{ flex: 1 }}>
          {value ? "Pin dropped. Drag it to adjust." : "Tap the map where it happens (optional)."}
        </span>
        {value && (
          <button type="button" className="link" onClick={() => onChange(null)}>
            Remove pin
          </button>
        )}
      </div>
    </div>
  );
}
