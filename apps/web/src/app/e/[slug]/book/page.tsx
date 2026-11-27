import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { BookForm, type BookDate } from "./book-form";

export const metadata: Metadata = { title: "Book", robots: { index: false, follow: false } };

type Props = { params: Promise<{ slug: string }> };

export default function BookPage({ params }: Props) {
  return (
    <>
      <SiteHeader action="none" />
      <main className="wrap book-page">
        <Suspense fallback={<div className="skeleton" style={{ height: 360, width: "100%", maxWidth: 560, borderRadius: 18 }} />}>
          <Book params={params} />
        </Suspense>
      </main>
    </>
  );
}

async function Book({ params }: Props) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{3,140}$/.test(slug)) notFound();
  const { supabase, user } = await requireUser(`/e/${slug}/book`);

  const [{ data: event }, { data: profile }, { data: priv }] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, title, slug, status, age_limit, women_only, clubs(name), event_occurrences(id, starts_at, ends_at, status, capacity, seats_taken, ticket_tiers(id, name, price_paise, quantity, sold, seats_per_ticket, position, sale_starts_at, sale_ends_at))",
      )
      .eq("slug", slug)
      .maybeSingle(),
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
    supabase.from("profiles_private").select("dob_year").eq("id", user.id).maybeSingle(),
  ]);
  if (!event) notFound();

  // Booking needs a finished profile with a birth year (18+, DECISIONS.md P11/P16).
  if (!profile?.username || !priv?.dob_year) {
    return (
      <div className="card book-card">
        <h1>One step first</h1>
        <p>Set up your profile (name, username, area, interests and birth year) so clubs know who&apos;s coming. It takes a minute.</p>
        <Link href={`/account/setup?next=${encodeURIComponent(`/e/${slug}/book`)}`} className="btn primary block">
          Set up my profile
        </Link>
      </div>
    );
  }

  const dates: BookDate[] = upcomingDates(event.event_occurrences);
  if (event.status !== "published" || dates.length === 0) {
    return (
      <div className="card book-card">
        <h1>{event.title}</h1>
        <p>There&apos;s nothing to book right now: no upcoming dates.</p>
        <Link href={`/e/${slug}`} className="btn block">
          Back to the event
        </Link>
      </div>
    );
  }
  return (
    <BookForm
      event={{ title: event.title, slug: event.slug, clubName: event.clubs?.name ?? null, ageLimit: event.age_limit, womenOnly: event.women_only }}
      dates={dates}
    />
  );
}

/** Scheduled dates that aren't over, soonest first, with their ticket types in order. Runs per request. */
function upcomingDates(
  occurrences: {
    id: string;
    starts_at: string;
    ends_at: string | null;
    status: string;
    capacity: number | null;
    seats_taken: number;
    ticket_tiers: BookDate["tiers"];
  }[],
): BookDate[] {
  const now = Date.now();
  return occurrences
    .filter((o) => o.status === "scheduled" && new Date(o.ends_at ?? new Date(o.starts_at).getTime() + 2 * 3_600_000).getTime() > now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .map((o) => ({
      id: o.id,
      startsAt: o.starts_at,
      spotsLeft: o.capacity == null ? null : Math.max(o.capacity - o.seats_taken, 0),
      tiers: [...o.ticket_tiers]
        .sort((a, b) => a.position - b.position)
        .filter((t) => (!t.sale_starts_at || new Date(t.sale_starts_at).getTime() <= now) && (!t.sale_ends_at || new Date(t.sale_ends_at).getTime() > now)),
    }));
}
