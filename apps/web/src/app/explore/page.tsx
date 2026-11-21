import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { DashSkeleton } from "@/components/organizer-ui";
import { getUpcomingEvents } from "@/lib/public-data";
import { ExploreView } from "./explore-view";

export const metadata: Metadata = {
  title: "Explore events in Bhubaneswar",
  description: "Runs, gigs, workshops, treks and markets on a map of Bhubaneswar. Filter by today, tonight or this weekend.",
};

export default function ExplorePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  return (
    <>
      <SiteHeader />
      <main className="wrap explore-page">
        <h1 className="sr-only">Explore events</h1>
        <Suspense fallback={<DashSkeleton />}>
          <Explore searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function Explore({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const [{ category }, rows] = await Promise.all([searchParams, getUpcomingEvents()]);
  // Remount when the category in the link changes, so the chips follow the URL.
  return <ExploreView key={category ?? "all"} rows={rows} initialCategory={category} />;
}
