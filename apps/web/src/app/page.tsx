import Link from "next/link";
import { CATEGORIES } from "@nikl/utils";
import { SiteHeader } from "@/components/site-header";
import { EventCard } from "@/components/event-card";
import { getWeekendPicks } from "@/lib/public-data";

/**
 * Home. Prerendered with cached event data (refreshes every few minutes, and right away when an organizer
 * changes an event), so shared links open instantly.
 */
export default async function Home() {
  const picks = await getWeekendPicks();
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <section className="hero">
          <span className="eyebrow">Bhubaneswar</span>
          <h1>Every plan in Bhubaneswar, in one app.</h1>
          <p className="lead">
            Runs, gigs, workshops, treks, markets and the clubs behind them. Find what&apos;s on this weekend and go with
            friends.
          </p>
          <div className="cta-row">
            <Link href="/explore" className="btn primary">
              Explore the map
            </Link>
            <Link href="/login" className="btn">
              Log in with your phone
            </Link>
          </div>
        </section>

        <section className="section" aria-labelledby="week-title">
          <div className="section-head" style={{ marginBottom: 14 }}>
            <h2 id="week-title" style={{ margin: 0 }}>
              {picks.title}
            </h2>
            <Link href="/explore" className="link">
              See all
            </Link>
          </div>
          {picks.rows.length > 0 ? (
            <ul className="rail">
              {picks.rows.map((r) => (
                <li key={r.event_id}>
                  <EventCard row={r} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="note">
              Events show up here once clubs start posting. Organizers: put your next event on Nikl in about two
              minutes.
            </p>
          )}
        </section>

        <section className="section" id="categories" aria-labelledby="cat-title">
          <h2 id="cat-title">Find your thing</h2>
          <div className="cats">
            {CATEGORIES.map((c) => (
              <Link
                key={c.id}
                href={`/explore?category=${c.id}`}
                className="cat"
                style={{ ["--tint" as string]: `var(--tint-${c.tint})` }}
              >
                <span aria-hidden="true">{c.emoji}</span>
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      </main>
      <footer className="footer">
        <div className="wrap">
          Nikl · Made in Bhubaneswar · <Link href="/organizer">For organizers</Link>
        </div>
      </footer>
    </>
  );
}
