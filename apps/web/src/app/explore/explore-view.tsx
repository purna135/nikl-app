"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, TIME_FILTERS, inTimeWindow, type TimeFilter } from "@nikl/utils";
import { EventCard } from "@/components/event-card";
import { EventsMap, type MapPoint } from "@/components/events-map";
import type { ExploreRow } from "@/lib/public-data";

type View = "map" | "grid";

/** Explore: map by default (DECISIONS.md D4), with filters, search and a grid view. */
export function ExploreView({ rows, initialCategory }: { rows: ExploreRow[]; initialCategory?: string }) {
  const [view, setView] = useState<View>("map");
  const [time, setTime] = useState<TimeFilter>("any");
  const [category, setCategory] = useState<string | null>(CATEGORIES.some((c) => c.id === initialCategory) ? initialCategory! : null);
  const [freeOnly, setFreeOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date();
    return rows.filter(
      (r) =>
        (time === "any" || inTimeWindow(r.starts_at, r.ends_at, time, now)) &&
        (!category || r.category === category) &&
        (!freeOnly || r.is_free) &&
        (!q || [r.title, r.club_name, r.venue_name, r.area].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [rows, time, category, freeOnly, query]);

  const points: MapPoint[] = useMemo(() => spreadSameSpot(filtered), [filtered]);
  const noPin = filtered.length - points.length;
  const selected = filtered.find((r) => r.event_id === selectedId) ?? null;

  const chip = (on: boolean) => `chip${on ? " on" : ""}`;

  return (
    <div className="explore">
      <div className="explore-bar">
        <label className="search-box">
          <span aria-hidden="true">🔍</span>
          <input
            type="search"
            placeholder="Search events, clubs, areas"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search events"
          />
        </label>
        <div className="seg" role="radiogroup" aria-label="View">
          {(["map", "grid"] as const).map((v) => (
            <button key={v} type="button" role="radio" aria-checked={view === v} className={view === v ? "on" : ""} onClick={() => setView(v)}>
              {v === "map" ? "Map" : "Grid"}
            </button>
          ))}
        </div>
      </div>

      <div className="chip-row" role="group" aria-label="When">
        {TIME_FILTERS.map((f) => (
          <button key={f.id} type="button" className={chip(time === f.id)} aria-pressed={time === f.id} onClick={() => setTime(f.id)}>
            {f.label}
          </button>
        ))}
        <button type="button" className={chip(freeOnly)} aria-pressed={freeOnly} onClick={() => setFreeOnly((v) => !v)}>
          Free
        </button>
      </div>
      <div className="chip-row" role="group" aria-label="Category">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={chip(category === c.id)}
            aria-pressed={category === c.id}
            onClick={() => setCategory((cur) => (cur === c.id ? null : c.id))}
          >
            {c.emoji} {c.short}
          </button>
        ))}
      </div>

      <p className="muted small result-count" aria-live="polite">
        {filtered.length === 0 ? "No events match." : `${filtered.length} event${filtered.length > 1 ? "s" : ""}`}
        {view === "map" && noPin > 0 ? ` · ${noPin} without a map pin (in the list)` : ""}
      </p>

      {view === "map" ? (
        <div className="explore-split">
          <div className="map-wrap">
            <EventsMap points={points} selectedId={selectedId} highlightId={hoverId ?? selectedId} onSelect={setSelectedId} />
            {selected && (
              <div className="map-card">
                <EventCard row={selected} compact />
                <button type="button" className="link" onClick={() => setSelectedId(null)} aria-label="Close">
                  Close
                </button>
              </div>
            )}
          </div>
          <ul className="explore-list">
            {filtered.map((r) => (
              <li key={r.event_id}>
                <EventCard
                  row={r}
                  compact
                  selected={r.event_id === selectedId || r.event_id === hoverId}
                  onHover={(on) => setHoverId((cur) => (on ? r.event_id : cur === r.event_id ? null : cur))}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="event-grid">
          {filtered.map((r) => (
            <li key={r.event_id}>
              <EventCard row={r} />
            </li>
          ))}
        </ul>
      )}

      {filtered.length === 0 && (
        <div className="empty">
          <p>Nothing matches these filters.</p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setTime("any");
              setCategory(null);
              setFreeOnly(false);
              setQuery("");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Events at the same venue would put pins exactly on top of each other, hiding all but one.
 * Number them per spot; the map fans them out by a few pixels so each can be tapped at any zoom.
 */
function spreadSameSpot(rows: ExploreRow[]): MapPoint[] {
  const seen = new Map<string, number>();
  return rows.flatMap((r) => {
    if (r.lat == null || r.lng == null) return [];
    const key = `${r.lat.toFixed(5)},${r.lng.toFixed(5)}`;
    const stack = seen.get(key) ?? 0;
    seen.set(key, stack + 1);
    return [{ id: r.event_id, lat: r.lat, lng: r.lng, category: r.category, title: r.title, stack }];
  });
}
