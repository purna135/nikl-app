import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { DashSkeleton, OrganizerHeader } from "@/components/organizer-ui";
import { EventForm } from "./event-form";

export const metadata: Metadata = { title: "New event" };

export default function NewEventPage({ searchParams }: { searchParams: Promise<{ club?: string }> }) {
  return (
    <>
      <OrganizerHeader />
      <main className="wrap dash narrow-page">
        <Link href="/organizer" className="back-link">
          ← Dashboard
        </Link>
        <h1>New event</h1>
        <Suspense fallback={<DashSkeleton />}>
          <NewEvent searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function NewEvent({ searchParams }: { searchParams: Promise<{ club?: string }> }) {
  const { club } = await searchParams;
  const { supabase, user } = await requireUser("/organizer/events/new");
  const { data } = await supabase
    .from("club_members")
    .select("role, clubs(id, name, review_status)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("role", ["owner", "admin"]);
  const clubs = (data ?? []).flatMap((m) => (m.clubs ? [m.clubs] : []));
  if (clubs.length === 0) redirect("/organizer");
  const defaultClubId = clubs.some((c) => c.id === club) ? club! : clubs[0]!.id;
  return <EventForm clubs={clubs} defaultClubId={defaultClubId} userId={user.id} />;
}
