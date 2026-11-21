import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { formatEventWhen } from "@nikl/utils";
import { isPlatformAdmin, requireUser } from "@/lib/auth";
import { DashSkeleton, OrganizerHeader, Pill, PosterThumb, clubStatusLabel, eventStatusLabel } from "@/components/organizer-ui";
import { CreateClubForm } from "./create-club-form";

export const metadata: Metadata = { title: "Organizer dashboard" };

export default function OrganizerPage({ searchParams }: { searchParams: Promise<{ club?: string }> }) {
  return (
    <>
      <OrganizerHeader />
      <main className="wrap dash">
        <Suspense fallback={<DashSkeleton />}>
          <OrganizerHome searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

/** Next upcoming date, how many more, and how many people are going across upcoming dates. */
function summarizeDates(occurrences: { starts_at: string; status: string; seats_taken: number }[]) {
  const now = Date.now();
  const upcoming = occurrences
    .filter((o) => o.status === "scheduled" && new Date(o.starts_at).getTime() > now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return { next: upcoming[0], moreDates: Math.max(0, upcoming.length - 1), going: upcoming.reduce((s, o) => s + o.seats_taken, 0) };
}

async function OrganizerHome({ searchParams }: { searchParams: Promise<{ club?: string }> }) {
  const { club: clubParam } = await searchParams;
  const { supabase, user } = await requireUser("/organizer");
  const [admin, { data: memberships }] = await Promise.all([
    isPlatformAdmin(supabase),
    supabase
      .from("club_members")
      .select("role, clubs(id, name, handle, category, kind, area, review_status, review_note)")
      .eq("user_id", user.id)
      .eq("status", "active"),
  ]);

  const clubs = (memberships ?? []).flatMap((m) => (m.clubs ? [{ ...m.clubs, role: m.role }] : []));
  let pendingForAdmin = 0;
  if (admin) {
    const { count } = await supabase.from("clubs").select("id", { count: "exact", head: true }).eq("review_status", "pending");
    pendingForAdmin = count ?? 0;
  }

  const adminBanner = admin && (
    <Link href="/admin/clubs" className="admin-banner">
      <strong>Nikl admin</strong> · {pendingForAdmin === 0 ? "No club pages waiting for review" : `${pendingForAdmin} club page${pendingForAdmin > 1 ? "s" : ""} waiting for review`} →
    </Link>
  );

  if (clubs.length === 0) {
    return (
      <div className="stack">
        {adminBanner}
        <section className="panel">
          <h1>Create your club page</h1>
          <p className="muted">
            Your page is where people follow you and book your events. Nikl reviews new pages before they go public, usually
            within a day. You can set up events straight away; they go live once your page is approved.
          </p>
          <CreateClubForm />
        </section>
      </div>
    );
  }

  const club = clubs.find((c) => c.id === clubParam) ?? clubs[0]!;
  const live = club.review_status === "approved";
  const canManage = club.role === "owner" || club.role === "admin";
  const status = clubStatusLabel(club.review_status);

  const { data: events } = await supabase
    .from("events")
    .select("id, title, status, category, poster_url, recurrence_rule, venues(name, area), event_occurrences(id, starts_at, status, seats_taken)")
    .eq("club_id", club.id)
    .order("created_at", { ascending: false });

  const rows = (events ?? []).map((e) => ({ ...e, ...summarizeDates(e.event_occurrences) }));

  return (
    <div className="stack">
      {adminBanner}

      <section className="panel club-head">
        <div className="club-title">
          <div>
            <h1>{club.name}</h1>
            <p className="muted">
              @{club.handle}
              {club.kind ? ` · ${club.kind}` : ""}
              {club.area ? ` · ${club.area}` : ""}
            </p>
          </div>
          <Pill tone={status.tone}>{status.label}</Pill>
        </div>
        {club.review_status === "pending" && (
          <p className="notice notice-warn">
            Nikl is reviewing your page (usually within a day). Set up your events now: anything you publish goes live the moment
            your page is approved.
          </p>
        )}
        {club.review_status === "rejected" && (
          <p className="notice notice-bad">
            Your page needs a few changes{club.review_note ? `: ${club.review_note}` : "."} Editing your page sends it back for review.
          </p>
        )}
        {club.review_status === "suspended" && (
          <p className="notice notice-bad">This page is suspended{club.review_note ? `: ${club.review_note}` : "."} Contact Nikl support.</p>
        )}
        {clubs.length > 1 && (
          <nav className="club-switch" aria-label="Your clubs">
            {clubs.map((c) => (
              <Link key={c.id} href={`/organizer?club=${c.id}`} aria-current={c.id === club.id ? "page" : undefined}>
                {c.name}
              </Link>
            ))}
          </nav>
        )}
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Events</h2>
          {canManage && (
            <Link href={`/organizer/events/new?club=${club.id}`} className="btn primary">
              New event
            </Link>
          )}
        </div>
        {!canManage && <p className="notice notice-warn">You&apos;re check-in staff for this club: you can see events and scan tickets, but only owners and admins can change them.</p>}
        {rows.length === 0 ? (
          <div className="empty">
            <p>No events yet.</p>
            <p className="muted">Start with your next one. If you already made a poster for Instagram, upload it and we&apos;ll fill in the details.</p>
          </div>
        ) : (
          <ul className="event-list">
            {rows.map((e) => {
              const s = eventStatusLabel(e.status, live);
              return (
                <li key={e.id}>
                  <Link href={`/organizer/events/${e.id}`} className="event-row">
                    <PosterThumb url={e.poster_url} category={e.category} />
                    <span className="event-main">
                      <strong>{e.title}</strong>
                      <span className="muted">
                        {e.next ? formatEventWhen(e.next.starts_at) : "No upcoming dates"}
                        {e.moreDates > 0 ? ` · +${e.moreDates} more date${e.moreDates > 1 ? "s" : ""}` : ""}
                        {e.venues?.name ? ` · ${e.venues.name}` : ""}
                      </span>
                    </span>
                    <span className="event-side">
                      <Pill tone={s.tone}>{s.label}</Pill>
                      <span className="muted small">{e.going} going</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
