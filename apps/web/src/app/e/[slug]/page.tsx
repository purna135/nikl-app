import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryById, formatEventDay, formatEventTime, formatEventWhen, formatPaise, priceSummary } from "@nikl/utils";
import { SiteHeader } from "@/components/site-header";
import { PosterArt } from "@/components/event-card";
import { ShareButtons } from "@/components/share-button";
import { SaveButton } from "@/components/social-buttons";
import { getEventBySlug, getPrerenderSlugs, type PublicEvent } from "@/lib/public-data";

type Props = { params: Promise<{ slug: string }> };

// Cache Components needs at least one param at build time; this one simply 404s.
const PLACEHOLDER_SLUG = "nikl-placeholder";

export async function generateStaticParams() {
  const slugs = await getPrerenderSlugs();
  return (slugs.length > 0 ? slugs : [PLACEHOLDER_SLUG]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ev = await getEventBySlug(slug);
  if (!ev) return { title: "Event not found" };
  const next = ev.upcoming[0];
  const summary = [next ? formatEventWhen(next.starts_at) : null, ev.venues?.name, ev.clubs?.name].filter(Boolean).join(" · ");
  const description = summary || ev.description?.slice(0, 160) || undefined;
  return {
    title: ev.title,
    description,
    openGraph: { title: ev.title, description, type: "website", images: ev.poster_url ? [{ url: ev.poster_url }] : undefined },
    twitter: { card: ev.poster_url ? "summary_large_image" : "summary", title: ev.title, description },
  };
}

export default function EventPage({ params }: Props) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<EventSkeleton />}>
        <EventContent params={params} />
      </Suspense>
    </>
  );
}

async function EventContent({ params }: Props) {
  const { slug } = await params;
  const ev = await getEventBySlug(slug);
  if (!ev) notFound();

  const cat = categoryById(ev.category);
  const next = ev.upcoming[0];
  const venue = ev.venues;
  // Price comes from upcoming dates only; with none left there's nothing to book, so no price line.
  const prices = ev.upcoming.flatMap((o) => o.ticket_tiers.map((t) => t.price_paise));
  const hasDates = prices.length > 0;
  const isFree = hasDates && prices.every((p) => p === 0);
  const price = priceSummary(isFree, hasDates ? Math.min(...prices) : null);
  const hasPin = venue?.lat != null && venue?.lng != null;

  return (
    <main className="wrap event-page">
      <div className="event-poster">
        <PosterArt url={ev.poster_url} category={ev.category} />
      </div>

      <div className="event-info">
        <div className="stack" style={{ gap: 10 }}>
          <Link href={`/explore?category=${ev.category}`} className="eyebrow" style={{ textDecoration: "none" }}>
            {cat?.emoji} {cat?.name ?? "Event"}
          </Link>
          <h1>{ev.title}</h1>
          {ev.clubs && (
            <Link href={`/c/${ev.clubs.handle}`} className="event-host">
              By {ev.clubs.name}
              {ev.clubs.verified && <span title="Verified club">✓</span>}
            </Link>
          )}
        </div>

        <StatusNotice ev={ev} />

        <ul className="facts">
          {next && (
            <li>
              <span aria-hidden="true">📅</span>
              <span>
                <strong>{formatEventDay(next.starts_at)}</strong>
                <span className="muted">
                  {formatEventTime(next.starts_at)}
                  {next.ends_at ? ` to ${formatEventTime(next.ends_at)}` : ""}
                  {ev.upcoming.length > 1 ? ` · ${ev.upcoming.length - 1} more date${ev.upcoming.length > 2 ? "s" : ""}` : ""}
                </span>
              </span>
            </li>
          )}
          <li>
            <span aria-hidden="true">📍</span>
            <span>
              <strong>{venue?.name ?? "Venue to be announced"}</strong>
              <span className="muted">{addressLine(venue?.address, venue?.area)}</span>
            </span>
          </li>
          {hasDates && (
            <li>
              <span aria-hidden="true">🎟️</span>
              <span>
                <strong>{price}</strong>
                <span className="muted">{isFree ? "RSVP to save your spot" : "Pay with UPI"}</span>
              </span>
            </li>
          )}
          {(ev.age_limit || ev.women_only) && (
            <li>
              <span aria-hidden="true">ℹ️</span>
              <span>
                {[ev.age_limit ? `${ev.age_limit}+ only` : null, ev.women_only ? "Women only" : null].filter(Boolean).join(" · ")}
              </span>
            </li>
          )}
        </ul>

        <div className="book-bar">
          {hasDates && (
            <>
              <Link href={`/e/${ev.slug}/book`} className="btn primary">
                {isFree ? "RSVP" : "Book"}
              </Link>
              <p className="hint" style={{ margin: 0, textAlign: "center" }}>
                {isFree ? "Free. Save your spot in a tap." : "Pay with UPI, cards or netbanking. Your seats are held for 10 minutes while you pay."}
              </p>
            </>
          )}
          <div className="actions-row">
            <SaveButton eventId={ev.id} slug={ev.slug} />
            <ShareButtons title={ev.title} />
          </div>
        </div>

        {ev.description && (
          <section className="stack" style={{ gap: 8 }}>
            <h2 className="small-h">About</h2>
            <p className="description">{ev.description}</p>
          </section>
        )}

        {ev.upcoming.length > 1 && (
          <section className="stack" style={{ gap: 4 }}>
            <h2 className="small-h">Dates</h2>
            <ul className="dates">
              {ev.upcoming.map((o) => (
                <li key={o.id}>
                  <span>
                    <strong>{formatEventDay(o.starts_at)}</strong> <span className="muted">{formatEventTime(o.starts_at)}</span>
                    <span className="tiers-line" style={{ display: "block" }}>
                      {o.ticket_tiers.map((t) => `${t.name} ${formatPaise(t.price_paise)}`).join(" · ")}
                    </span>
                  </span>
                  <SpotsLeft capacity={o.capacity} taken={o.seats_taken} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {venue && (
          <section className="stack" style={{ gap: 10 }}>
            <h2 className="small-h">Where</h2>
            {hasPin && <StaticMap lat={venue.lat!} lng={venue.lng!} label={venue.name} />}
            <a className="link" href={directionsUrl(venue)} target="_blank" rel="noopener noreferrer">
              Get directions ↗
            </a>
          </section>
        )}

        {ev.refund_policy && (
          <section className="stack" style={{ gap: 8 }}>
            <h2 className="small-h">Refunds</h2>
            <p className="muted" style={{ margin: 0 }}>
              {ev.refund_policy}
            </p>
          </section>
        )}

        {ev.tags.length > 0 && (
          <div className="tags">
            {ev.tags.map((t) => (
              <span key={t} className="tag">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function StatusNotice({ ev }: { ev: PublicEvent }) {
  if (ev.status === "cancelled") return <p className="notice notice-bad">This event was cancelled by the organizer.</p>;
  if (ev.status === "ended" || ev.upcoming.length === 0) {
    return <p className="notice notice-warn">No upcoming dates right now. Check the club&apos;s page for what&apos;s next.</p>;
  }
  return null;
}

function SpotsLeft({ capacity, taken }: { capacity: number | null; taken: number }) {
  if (capacity == null) return null;
  const left = Math.max(capacity - taken, 0);
  if (left === 0) return <span className="pill pill-bad">Full</span>;
  if (left <= 10) return <span className="pill pill-warn">{left} left</span>;
  return null;
}

function StaticMap({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  const pin = `pin-l+d81b60(${lng},${lat})`;
  const src = `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${pin}/${lng},${lat},14.5,0/640x320@2x?access_token=${token}`;
  // eslint-disable-next-line @next/next/no-img-element -- Mapbox Static Images, already sized
  return <img className="static-map" src={src} alt={`Map showing ${label}`} loading="lazy" width={640} height={320} />;
}

/** "Infocity, Patia" + "Patia" → "Infocity, Patia" (no repeated area). */
function addressLine(address: string | null | undefined, area: string | null | undefined) {
  if (!address) return area ?? "";
  if (!area || address.toLowerCase().includes(area.toLowerCase())) return address;
  return `${address}, ${area}`;
}

function directionsUrl(venue: NonNullable<PublicEvent["venues"]>) {
  if (venue.lat != null && venue.lng != null) return `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`;
  const q = [venue.name, venue.address, venue.area, "Bhubaneswar"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function EventSkeleton() {
  return (
    <main className="wrap event-page" aria-busy="true">
      <div className="skeleton" style={{ aspectRatio: "4 / 5", borderRadius: 20 }} />
      <div className="stack">
        <div className="skeleton" style={{ height: 40, width: "70%" }} />
        <div className="skeleton" style={{ height: 120 }} />
        <div className="skeleton" style={{ height: 90 }} />
      </div>
    </main>
  );
}
