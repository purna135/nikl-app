import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { DashSkeleton, OrganizerHeader } from "@/components/organizer-ui";
import { StoryForm } from "./story-form";

export const metadata: Metadata = { title: "New story" };

export default function NewStoryPage({ searchParams }: { searchParams: Promise<{ club?: string }> }) {
  return (
    <>
      <OrganizerHeader />
      <main className="wrap dash narrow-page">
        <Link href="/organizer" className="back-link">
          ← Dashboard
        </Link>
        <h1>New story</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Stories show at the top of people&apos;s Home for 24 hours. Every event you publish already gets one automatically.
        </p>
        <Suspense fallback={<DashSkeleton />}>
          <NewStory searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function NewStory({ searchParams }: { searchParams: Promise<{ club?: string }> }) {
  const { club } = await searchParams;
  const { supabase, user } = await requireUser("/organizer/stories/new");
  const { data } = await supabase
    .from("club_members")
    .select("role, clubs(id, name, review_status)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("role", ["owner", "admin"]);
  const clubs = (data ?? []).flatMap((m) => (m.clubs ? [m.clubs] : []));
  if (clubs.length === 0) redirect("/organizer");
  const clubId = clubs.some((c) => c.id === club) ? club! : clubs[0]!.id;

  const { data: events } = await supabase
    .from("events")
    .select("id, title, event_occurrences(starts_at, status)")
    .eq("club_id", clubId)
    .eq("status", "published")
    .order("created_at", { ascending: false });
  const upcoming = upcomingEvents(events ?? []);

  return <StoryForm clubs={clubs} clubId={clubId} events={upcoming} userId={user.id} />;
}

function upcomingEvents(events: { id: string; title: string; event_occurrences: { starts_at: string; status: string }[] }[]) {
  const now = Date.now();
  return events
    .filter((e) => e.event_occurrences.some((o) => o.status === "scheduled" && new Date(o.starts_at).getTime() > now))
    .map((e) => ({ id: e.id, title: e.title }));
}
