import Link from "next/link";
import { categoryById, formatEventWhen, priceSummary } from "@nikl/utils";
import type { ExploreRow } from "@/lib/public-data";

export function priceLabel(row: Pick<ExploreRow, "is_free" | "min_price_paise">): string {
  return priceSummary(row.is_free, row.min_price_paise);
}

/** Poster, or a soft category tile when an event has no poster yet. */
export function PosterArt({ url, category, className }: { url: string | null; category: string; className?: string }) {
  const cat = categoryById(category);
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- posters live in Supabase Storage
    return <img src={url} alt="" className={`poster-art ${className ?? ""}`} loading="lazy" />;
  }
  return (
    <span className={`poster-art poster-tile ${className ?? ""}`} style={{ ["--tint" as string]: `var(--tint-${cat?.tint ?? "sky"})` }} aria-hidden="true">
      {cat?.emoji ?? "📅"}
    </span>
  );
}

/**
 * Event card used on the home page, Explore grid and club pages. Works in server and client components.
 * `onHover` lets Explore highlight the matching map pin; it never moves the map.
 */
export function EventCard({
  row,
  compact = false,
  selected = false,
  onHover,
}: {
  row: ExploreRow;
  compact?: boolean;
  selected?: boolean;
  onHover?: (on: boolean) => void;
}) {
  return (
    <Link
      href={`/e/${row.slug}`}
      className={`event-card${compact ? " compact" : ""}${selected ? " selected" : ""}`}
      onMouseEnter={onHover && (() => onHover(true))}
      onMouseLeave={onHover && (() => onHover(false))}
      onFocus={onHover && (() => onHover(true))}
      onBlur={onHover && (() => onHover(false))}
    >
      <PosterArt url={row.poster_url} category={row.category} />
      <span className="event-card-body">
        <span className="event-when">{formatEventWhen(row.starts_at)}</span>
        <strong>{row.title}</strong>
        <span className="muted small">
          {[row.venue_name, row.area].filter(Boolean).join(", ") || "Venue to be announced"}
          {row.more_dates > 0 ? ` · +${row.more_dates} more date${row.more_dates > 1 ? "s" : ""}` : ""}
        </span>
        <span className="event-meta">
          <span className={`price${row.is_free ? " free" : ""}`}>{priceLabel(row)}</span>
          <span className="muted small">
            {row.club_name}
            {row.club_verified ? " ✓" : ""}
          </span>
        </span>
      </span>
    </Link>
  );
}
