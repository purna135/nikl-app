import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { formatEventWhen, formatTimeAgo } from "@nikl/utils";
import { isPlatformAdmin, requireUser } from "@/lib/auth";
import { DashSkeleton, OrganizerHeader, Pill, PosterThumb, clubStatusLabel, eventStatusLabel } from "@/components/organizer-ui";
import { CreateClubForm } from "./create-club-form";
import { deletePostAction, deleteStoryAction } from "./actions";
import { postMediaUrl } from "@/lib/media";

export const metadata: Metadata = { title: "Organizer dashboard" };

export default function OrganizerPage({ searchParams }: { searchParams: Promise<{ club?: string; posted?: string; story?: string; error?: string }> }) {
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

/** Now, for "stories still live". Runs per request, after the login check. */
const nowIso = () => new Date().toISOString();
const hoursLeft = (iso: string) => Math.max(1, Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000));

/** "3h", "2d" (shared with the app). Runs per request, after the login check. */
const timeAgo = (iso: string) => formatTimeAgo(iso);

/** Next upcoming date, how many more, and how many people are going across upcoming dates. */
function summarizeDates(occurrences: { starts_at: string; status: string; seats_taken: number }[]) {
  const now = Date.now();
  const upcoming = occurrences
    .filter((o) => o.status === "scheduled" && new Date(o.starts_at).getTime() > now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return { next: upcoming[0], moreDates: Math.max(0, upcoming.length - 1), going: upcoming.reduce((s, o) => s + o.seats_taken, 0) };
}

async function OrganizerHome({ searchParams }: { searchParams: Promise<{ club?: string; posted?: string; story?: string; error?: string }> }) {
  const { club: clubParam, posted, story, error } = await searchParams;
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
  let toModerate = 0;
  if (admin) {
    const [{ count }, { data: queue }] = await Promise.all([
      supabase.from("clubs").select("id", { count: "exact", head: true }).eq("review_status", "pending"),
      supabase.rpc("moderation_queue"),
    ]);
    pendingForAdmin = count ?? 0;
    toModerate = queue?.length ?? 0;
  }

  const adminBanner = admin && (
    <div className="stack" style={{ gap: 8 }}>
      <Link href="/admin/clubs" className="admin-banner">
        <strong>Nikl admin</strong> · {pendingForAdmin === 0 ? "No club pages waiting for review" : `${pendingForAdmin} club page${pendingForAdmin > 1 ? "s" : ""} waiting for review`} →
      </Link>
      <Link href="/admin/moderation" className="admin-banner">
        <strong>Moderation</strong> · {toModerate === 0 ? "Nothing to check" : `${toModerate} post${toModerate > 1 ? "s" : ""} or stor${toModerate > 1 ? "ies" : "y"} to check`} →
      </Link>
    </div>
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

  const [{ data: followers }, { data: posts }, { data: stories }] = await Promise.all([
    supabase.rpc("follower_count", { p_target_type: "club", p_target_id: club.id }),
    supabase
      .from("posts")
      .select("id, caption, created_at, moderation_status, events(title, poster_url, category), post_media(url, position)")
      .eq("author_type", "club")
      .eq("author_id", club.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("stories")
      .select("id, kind, media_url, expires_at, created_at, moderation_status, events(title, poster_url, category)")
      .eq("author_type", "club")
      .eq("author_id", club.id)
      .gt("expires_at", nowIso())
      .order("created_at", { ascending: false }),
  ]);
  // Who liked what is private (P19); counts come from a public function.
  const likeCounts = await Promise.all(
    (posts ?? []).map((p) => supabase.rpc("like_count", { p_post_id: p.id }).then(({ data }) => [p.id, data ?? 0] as const)),
  );
  const likesOf = new Map(likeCounts);

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
              {` · ${followers ?? 0} ${followers === 1 ? "follower" : "followers"}`}
            </p>
          </div>
          <Pill tone={status.tone}>{status.label}</Pill>
        </div>
        {error && (
          <p className="notice notice-bad" role="alert">
            {error.slice(0, 200)}
          </p>
        )}
        {story && (
          <p className="notice notice-good" role="status">
            Story shared. It shows at the top of people&apos;s Home for 24 hours{live ? "" : " once your page is approved"}.
          </p>
        )}
        {posted && (
          <p className="notice notice-good" role="status">
            Posted. It&apos;s in your followers&apos; feed{live ? "" : " once your page is approved"}.
          </p>
        )}
        {club.review_status === "pending" && (
          <p className="notice notice-warn">
            Nikl is reviewing your page (usually within a day). Set up your events now: anything you publish goes live the moment
            your page is approved.
          </p>
        )}
        {club.review_status === "rejected" && (
          <p className="notice notice-bad">
            Your page needs a few changes{club.review_note ? `: ${club.review_note}` : "."} Editing club pages is coming soon; until then, Nikl will help you make the changes.
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
        {!canManage && <p className="notice notice-warn">You&apos;re check-in staff for this club: you can see events (ticket scanning arrives with bookings), but only owners and admins can change them.</p>}
        {rows.length === 0 ? (
          <div className="empty">
            <p>No events yet.</p>
            <p className="muted">Start with your next one: add the poster, date, venue and tickets in a couple of minutes.</p>
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

      <section className="panel">
        <div className="section-head">
          <h2>
            Stories <span className="muted small">(live now: {(stories ?? []).length})</span>
          </h2>
          {canManage && (
            <Link href={`/organizer/stories/new?club=${club.id}`} className="btn">
              New story
            </Link>
          )}
        </div>
        {(stories ?? []).length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No live stories. Publishing an event adds one automatically; add your own for lineups, behind the scenes or last spots.
          </p>
        ) : (
          <ul className="post-list">
            {(stories ?? []).map((st) => (
              <li key={st.id}>
                <PosterThumb
                  url={st.moderation_status === "rejected" ? null : postMediaUrl(st.media_url) ?? st.events?.poster_url ?? null}
                  category={st.events?.category ?? club.category ?? "social"}
                />
                <span className="event-main">
                  <strong>{st.kind === "event_auto" ? `Auto story: ${st.events?.title ?? "event"}` : st.events?.title ? `Story: ${st.events.title}` : "Photo story"}</strong>
                  <span className="muted">
                    {timeAgo(st.created_at)} · {hoursLeft(st.expires_at)}h left
                  </span>
                  <ContentStatus status={st.moderation_status} />
                </span>
                {canManage && (
                  <form action={deleteStoryAction}>
                    <input type="hidden" name="storyId" value={st.id} />
                    <input type="hidden" name="clubId" value={club.id} />
                    <button type="submit" className="link danger-link">
                      Delete
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Posts</h2>
          {canManage && (
            <Link href={`/organizer/posts/new?club=${club.id}`} className="btn primary">
              New post
            </Link>
          )}
        </div>
        {(posts ?? []).length === 0 ? (
          <div className="empty">
            <p>No posts yet.</p>
            <p className="muted">Post a lineup, a sneak peek or a photo from your last event. It shows in your followers&apos; feed.</p>
          </div>
        ) : (
          <ul className="post-list">
            {(posts ?? []).map((p) => (
              <li key={p.id}>
                <PosterThumb
                  url={
                    // Removed posts' photos were deleted by Nikl, so don't try to show them.
                    p.moderation_status === "rejected"
                      ? null
                      : postMediaUrl([...p.post_media].sort((a, b) => a.position - b.position)[0]?.url) ?? p.events?.poster_url ?? null
                  }
                  category={p.events?.category ?? club.category ?? "social"}
                />
                <span className="event-main">
                  <strong>{p.caption ? (p.caption.length > 80 ? `${p.caption.slice(0, 80)}…` : p.caption) : p.events?.title ?? "Photo post"}</strong>
                  <span className="muted">
                    {timeAgo(p.created_at)}
                    {p.events?.title ? ` · ${p.events.title}` : ""} · {likesOf.get(p.id) ?? 0} likes
                  </span>
                  <ContentStatus status={p.moderation_status} />
                </span>
                {canManage && (
                  <form action={deletePostAction}>
                    <input type="hidden" name="postId" value={p.id} />
                    <input type="hidden" name="clubId" value={club.id} />
                    <button type="submit" className="link danger-link">
                      Delete
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Shows when Nikl removed a post or story, or reports have hidden it (the team also gets a notification). */
function ContentStatus({ status }: { status: string }) {
  if (status === "rejected") return <Pill tone="bad">Removed by Nikl</Pill>;
  if (status === "flagged") return <Pill tone="warn">Hidden while Nikl checks reports</Pill>;
  return null;
}
