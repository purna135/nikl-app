import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryById } from "@nikl/utils";
import { SiteHeader } from "@/components/site-header";
import { EventCard, PosterArt } from "@/components/event-card";
import { FollowButton } from "@/components/social-buttons";
import { postMediaUrl } from "@/lib/media";
import { getClubByHandle, getPrerenderHandles } from "@/lib/public-data";

type Props = { params: Promise<{ handle: string }> };

// Cache Components needs at least one param at build time; this one simply 404s.
const PLACEHOLDER_HANDLE = "nikl-placeholder";

export async function generateStaticParams() {
  const handles = await getPrerenderHandles();
  return (handles.length > 0 ? handles : [PLACEHOLDER_HANDLE]).map((handle) => ({ handle }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const data = await getClubByHandle(handle);
  if (!data) return { title: "Club not found" };
  const { club } = data;
  const description = club.bio ?? `${club.kind ?? "Club"} in ${club.area ?? "Bhubaneswar"} on Nikl.`;
  return { title: `${club.name} (@${club.handle})`, description, openGraph: { title: club.name, description } };
}

export default function ClubPage({ params }: Props) {
  return (
    <>
      <SiteHeader />
      <Suspense
        fallback={
          <main className="wrap club-page" aria-busy="true">
            <div className="skeleton" style={{ height: 80 }} />
            <div className="skeleton" style={{ height: 260 }} />
          </main>
        }
      >
        <ClubContent params={params} />
      </Suspense>
    </>
  );
}

async function ClubContent({ params }: Props) {
  const { handle } = await params;
  const data = await getClubByHandle(handle);
  if (!data) notFound();
  const { club, events, posts } = data;
  const cat = club.category ? categoryById(club.category) : undefined;

  return (
    <main className="wrap club-page">
      <header className="club-head">
        <span className="club-avatar" style={{ ["--tint" as string]: `var(--tint-${cat?.tint ?? "sky"})` }} aria-hidden="true">
          {cat?.emoji ?? "✨"}
        </span>
        <div>
          <h1>
            {club.name}
            {club.verified && (
              <span title="Verified club" style={{ fontSize: 18, marginLeft: 6 }}>
                ✓
              </span>
            )}
          </h1>
          <p className="muted">
            @{club.handle}
            {club.kind ? ` · ${club.kind}` : ""}
            {club.area ? ` · ${club.area}` : ""}
            {club.rating_count > 0 ? ` · ★ ${Number(club.rating_avg).toFixed(1)} (${club.rating_count})` : ""}
          </p>
        </div>
      </header>

      <FollowButton clubId={club.id} handle={club.handle} />

      {club.bio && <p className="lead" style={{ fontSize: 16 }}>{club.bio}</p>}

      <section className="stack" aria-labelledby="club-events">
        <h2 id="club-events" style={{ fontSize: 20 }}>
          Upcoming
        </h2>
        {events.length === 0 ? (
          <div className="empty">
            <p>No upcoming events right now.</p>
            <Link href="/explore" className="link">
              See what else is on
            </Link>
          </div>
        ) : (
          <ul className="event-grid">
            {events.map((r) => (
              <li key={r.event_id}>
                <EventCard row={r} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {posts.length > 0 && (
        <section className="stack" aria-labelledby="club-posts">
          <h2 id="club-posts" style={{ fontSize: 20 }}>
            Posts
          </h2>
          <ul className="post-grid">
            {posts.map((p) => {
              const photo = postMediaUrl(p.mediaPath);
              const label = p.caption ?? p.event?.title ?? "Post";
              const tile = photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- post photos live in Supabase Storage
                <img src={photo} alt={label} className="poster-art" loading="lazy" />
              ) : (
                <PosterArt url={p.event?.poster_url ?? null} category={p.event?.category ?? club.category ?? "social"} />
              );
              return (
                <li key={p.id}>
                  {p.event ? (
                    <Link href={`/e/${p.event.slug}`} className="post-tile" title={label}>
                      {tile}
                    </Link>
                  ) : (
                    <span className="post-tile" title={label}>
                      {tile}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
