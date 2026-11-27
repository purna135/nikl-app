import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { formatTimeAgo } from "@nikl/utils";
import { isPlatformAdmin, requireUser } from "@/lib/auth";
import { DashSkeleton, OrganizerHeader, Pill } from "@/components/organizer-ui";
import { postMediaUrl } from "@/lib/media";
import { resolveReportAction, setModerationModeAction } from "../actions";
import { ModerateForm } from "./moderate-form";

export const metadata: Metadata = { title: "Moderation" };

const REASONS: Record<string, string> = {
  spam: "Spam",
  nudity: "Nudity",
  violence: "Violence",
  harassment: "Harassment",
  hate: "Hate",
  scam: "Scam",
  false_info: "False information",
  other: "Something else",
};

export default function ModerationPage() {
  return (
    <>
      <OrganizerHeader section="Nikl admin" />
      <main className="wrap dash">
        <nav className="club-switch" aria-label="Admin pages" style={{ marginBottom: 16 }}>
          <Link href="/admin/clubs">Club pages</Link>
          <Link href="/admin/moderation" aria-current="page">
            Moderation
          </Link>
        </nav>
        <h1>Moderation</h1>
        <Suspense fallback={<DashSkeleton />}>
          <Moderation />
        </Suspense>
      </main>
    </>
  );
}

/** "3h" etc.; runs per request after the login check. */
const ago = (iso: string) => formatTimeAgo(iso);

async function Moderation() {
  const { supabase } = await requireUser("/admin/moderation");
  if (!(await isPlatformAdmin(supabase))) {
    return <p className="notice notice-bad">Only Nikl admins can see this page.</p>;
  }

  const [{ data: queue, error }, { data: reports }, { data: setting }] = await Promise.all([
    supabase.rpc("moderation_queue"),
    supabase.rpc("open_reports"),
    supabase.from("app_settings").select("value").eq("key", "moderation_mode").maybeSingle(),
  ]);
  const mode = setting?.value === "publish" ? "publish" : "review";

  return (
    <div className="stack">
      <section className="panel">
        <div className="section-head">
          <h2>Review switch</h2>
          <Pill tone={mode === "review" ? "good" : "warn"}>{mode === "review" ? "Checking first" : "Publishing straight away"}</Pill>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {mode === "review"
            ? "People's photos and notes wait here until a Nikl admin approves them. Event-card \"Your plans\" stories and club posts go out straight away."
            : "People's photos and notes go out straight away. Reports still hide anything 3 people flag. Use this only when automatic checks are running or volume is tiny."}
        </p>
        <form action={setModerationModeAction}>
          <input type="hidden" name="mode" value={mode === "review" ? "publish" : "review"} />
          <button className="btn" type="submit">
            {mode === "review" ? "Switch to publishing straight away" : "Switch back to checking first"}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>
          Posts and stories to check <span className="muted small">({queue?.length ?? 0})</span>
        </h2>
        {error && <p className="notice notice-bad">{error.message}</p>}
        {(queue ?? []).length === 0 ? (
          <p className="muted">All clear. New posts from people, and anything reported, show up here.</p>
        ) : (
          <ul className="review-list">
            {(queue ?? []).map((item) => (
              <li key={`${item.target_type}:${item.target_id}`}>
                <div className="review-main">
                  <div className="actions-row">
                    <strong>
                      {item.target_type === "post" ? "Post" : "Story"} by {item.author_type === "club" ? "club " : ""}
                      {item.author_handle ? `@${item.author_handle}` : item.author_name ?? "someone"}
                    </strong>
                    <Pill tone={item.status === "flagged" ? "bad" : item.status === "pending" ? "warn" : "muted"}>
                      {item.status === "flagged" ? "Hidden by reports" : item.status === "pending" ? "Waiting" : "Live, reported"}
                    </Pill>
                  </div>
                  <span className="muted small">
                    {ago(item.created_at)}
                    {item.event_title ? ` · about ${item.event_title}` : ""}
                    {item.report_count > 0
                      ? ` · ${item.report_count} report${item.report_count > 1 ? "s" : ""}: ${item.reasons.map((r) => REASONS[r] ?? r).join(", ")}`
                      : ""}
                  </span>
                  {item.media_paths.length > 0 && (
                    <div className="mod-photos">
                      {item.media_paths.map((path) => {
                        const url = postMediaUrl(path);
                        return url ? (
                          <a key={path} href={url} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element -- photos under review, from Supabase Storage */}
                            <img src={url} alt="Photo under review" loading="lazy" />
                          </a>
                        ) : null;
                      })}
                    </div>
                  )}
                  {item.caption && <p>{item.caption}</p>}
                </div>
                <ModerateForm targetType={item.target_type === "story" ? "story" : "post"} targetId={item.target_id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>
          Reports about people, clubs and events <span className="muted small">({reports?.length ?? 0})</span>
        </h2>
        {(reports ?? []).length === 0 ? (
          <p className="muted">No open reports.</p>
        ) : (
          <ul className="review-list compact">
            {(reports ?? []).map((r) => (
              <li key={r.report_id}>
                <div className="review-main">
                  <strong>
                    {r.target_type === "user" ? "Person" : r.target_type === "club" ? "Club" : "Event"}: {r.target_label ?? "(gone)"}
                  </strong>
                  <span className="muted small">
                    {REASONS[r.reason] ?? r.reason} · reported by {r.reporter} · {ago(r.created_at)}
                  </span>
                  {r.details && <p>{r.details}</p>}
                </div>
                <div className="actions-row">
                  <form action={resolveReportAction}>
                    <input type="hidden" name="reportId" value={r.report_id} />
                    <input type="hidden" name="status" value="actioned" />
                    <button className="btn" type="submit">
                      Handled
                    </button>
                  </form>
                  <form action={resolveReportAction}>
                    <input type="hidden" name="reportId" value={r.report_id} />
                    <input type="hidden" name="status" value="dismissed" />
                    <button className="btn" type="submit">
                      Dismiss
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
