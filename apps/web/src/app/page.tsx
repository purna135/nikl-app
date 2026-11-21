import Link from "next/link";
import { CATEGORIES } from "@nikl/utils";
import { SiteHeader } from "@/components/site-header";

/**
 * Week 1 web shell. Static, so it prerenders and loads instantly from shared links.
 * Week 3 replaces the placeholder with live events (map default) from the database.
 */
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <section className="hero">
          <span className="eyebrow">Bhubaneswar · launching soon</span>
          <h1>Every plan in Bhubaneswar, in one app.</h1>
          <p className="lead">
            Runs, gigs, workshops, treks, markets and the clubs behind them. Find what&apos;s on this weekend, book with UPI,
            and go with friends.
          </p>
          <div className="cta-row">
            <Link href="/login" className="btn primary">
              Log in with your phone
            </Link>
            <a href="#categories" className="btn">
              Browse categories
            </a>
          </div>
        </section>

        <section className="section" id="categories" aria-labelledby="cat-title">
          <h2 id="cat-title">Find your thing</h2>
          <div className="cats">
            {CATEGORIES.map((c) => (
              <div key={c.id} className="cat" style={{ ["--tint" as string]: `var(--tint-${c.tint})` }}>
                <span aria-hidden="true">{c.emoji}</span>
                {c.name}
              </div>
            ))}
          </div>
        </section>

        <section className="section" aria-labelledby="week-title">
          <h2 id="week-title">This weekend</h2>
          <p className="note">
            Events show up here once clubs start posting. Organizers: you&apos;ll be able to create an event from your Instagram
            poster in about two minutes.
          </p>
        </section>
      </main>
      <footer className="footer">
        <div className="wrap">Nikl · Made in Bhubaneswar</div>
      </footer>
    </>
  );
}
