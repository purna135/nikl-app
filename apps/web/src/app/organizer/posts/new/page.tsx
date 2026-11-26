import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { DashSkeleton, OrganizerHeader } from "@/components/organizer-ui";
import { PostForm } from "./post-form";

export const metadata: Metadata = { title: "New post" };

export default function NewPostPage({ searchParams }: { searchParams: Promise<{ club?: string }> }) {
  return (
    <>
      <OrganizerHeader />
      <main className="wrap dash narrow-page">
        <Link href="/organizer" className="back-link">
          ← Dashboard
        </Link>
        <h1>New post</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Posts appear in your followers&apos; home feed and on your club page.
        </p>
        <Suspense fallback={<DashSkeleton />}>
          <NewPost searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function NewPost({ searchParams }: { searchParams: Promise<{ club?: string }> }) {
  const { club } = await searchParams;
  const { supabase, user } = await requireUser("/organizer/posts/new");
  const { data } = await supabase
    .from("club_members")
    .select("role, clubs(id, name, review_status)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("role", ["owner", "admin"]);
  const clubs = (data ?? []).flatMap((m) => (m.clubs ? [m.clubs] : []));
  if (clubs.length === 0) redirect("/organizer");
  const clubId = clubs.some((c) => c.id === club) ? club! : clubs[0]!.id;

  // Published events of this club that still have a date ahead, to attach to the post.
  const { data: events } = await supabase
    .from("events")
    .select("id, title, event_occurrences(starts_at, status)")
    .eq("club_id", clubId)
    .eq("status", "published")
    .order("created_at", { ascending: false });
  const upcoming = upcomingEvents(events ?? []);

  return <PostForm clubs={clubs} clubId={clubId} events={upcoming} userId={user.id} />;
}

function upcomingEvents(events: { id: string; title: string; event_occurrences: { starts_at: string; status: string }[] }[]) {
  const now = Date.now();
  return events
    .filter((e) => e.event_occurrences.some((o) => o.status === "scheduled" && new Date(o.starts_at).getTime() > now))
    .map((e) => ({ id: e.id, title: e.title }));
}
