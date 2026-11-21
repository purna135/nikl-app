import { Suspense } from "react";
import type { Metadata } from "next";
import { categoryById, formatEventWhen } from "@nikl/utils";
import { isPlatformAdmin, requireUser } from "@/lib/auth";
import { DashSkeleton, OrganizerHeader, Pill, clubStatusLabel } from "@/components/organizer-ui";
import { ReviewClubForm } from "./review-club-form";

export const metadata: Metadata = { title: "Review club pages" };

export default function AdminClubsPage() {
  return (
    <>
      <OrganizerHeader section="Nikl admin" />
      <main className="wrap dash">
        <h1>Club pages</h1>
        <Suspense fallback={<DashSkeleton />}>
          <AdminClubs />
        </Suspense>
      </main>
    </>
  );
}

async function AdminClubs() {
  const { supabase } = await requireUser("/admin/clubs");
  if (!(await isPlatformAdmin(supabase))) {
    return <p className="notice notice-bad">Only Nikl admins can see this page.</p>;
  }

  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, name, handle, category, kind, area, bio, review_status, review_note, created_at, reviewed_at, profiles!clubs_created_by_fkey(name, username)")
    .order("created_at", { ascending: false })
    .limit(100);

  const pending = (clubs ?? []).filter((c) => c.review_status === "pending");
  const others = (clubs ?? []).filter((c) => c.review_status !== "pending").slice(0, 30);

  return (
    <div className="stack">
      <section className="panel">
        <h2>
          Waiting for review <span className="muted small">({pending.length})</span>
        </h2>
        {pending.length === 0 ? (
          <p className="muted">Nothing to review. New club pages show up here.</p>
        ) : (
          <ul className="review-list">
            {pending.map((c) => {
              const cat = categoryById(c.category);
              return (
                <li key={c.id}>
                  <div className="review-main">
                    <strong>{c.name}</strong>
                    <span className="muted">
                      @{c.handle} · {cat?.emoji} {cat?.name}
                      {c.kind ? ` · ${c.kind}` : ""}
                      {c.area ? ` · ${c.area}` : ""}
                    </span>
                    {c.bio && <p>{c.bio}</p>}
                    <span className="muted small">
                      Created {formatEventWhen(c.created_at)}
                      {c.profiles?.name ? ` by ${c.profiles.name}` : ""}
                    </span>
                  </div>
                  <ReviewClubForm clubId={c.id} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Recently reviewed</h2>
        <ul className="review-list compact">
          {others.map((c) => {
            const s = clubStatusLabel(c.review_status);
            return (
              <li key={c.id}>
                <div className="review-main">
                  <strong>{c.name}</strong>
                  <span className="muted small">
                    @{c.handle}
                    {c.review_note ? ` · "${c.review_note}"` : ""}
                  </span>
                </div>
                <Pill tone={s.tone}>{s.label}</Pill>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
