"use server";

import { refresh, updateTag } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { dbErrorMessage, type ActionResult } from "@/lib/errors";
import { POST_MEDIA_PATH } from "@/lib/media";

/** Nikl admins approve, reject or suspend a club page. The database checks the admin role and logs it. */
export async function reviewClubAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const clubId = fd.get("clubId");
  const decision = fd.get("decision");
  const note = (fd.get("note") as string | null)?.trim() || undefined;
  if (typeof clubId !== "string" || (decision !== "approved" && decision !== "rejected" && decision !== "suspended")) {
    return { ok: false, message: "Choose approve or reject." };
  }
  if (decision !== "approved" && !note) {
    return { ok: false, message: "Add a short note so the organizer knows what to fix." };
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("review_club", { p_club_id: clubId, p_decision: decision, p_note: note });
  if (error) return { ok: false, message: dbErrorMessage(error) };
  // Approving (or suspending) changes what's public: the club page and all its events.
  updateTag("clubs");
  updateTag("events");
  refresh();
  return { ok: true, message: decision === "approved" ? "Approved. The club and its events are now live." : "Saved." };
}

/** Approve or remove a post or story from the moderation queue. Removing needs a reason (the person sees it). */
export async function moderateAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const targetType = fd.get("targetType");
  const targetId = fd.get("targetId");
  const decision = fd.get("decision");
  const note = (fd.get("note") as string | null)?.trim() || undefined;
  if ((targetType !== "post" && targetType !== "story") || typeof targetId !== "string") return { ok: false, message: "Missing item." };
  if (decision !== "approved" && decision !== "rejected") return { ok: false, message: "Approve or remove." };
  if (decision === "rejected" && !note) return { ok: false, message: "Add a short reason for the person who posted it." };
  const supabase = await createServerSupabase();
  const { data: removedPaths, error } = await supabase.rpc("moderate_content", {
    p_target_type: targetType,
    p_target_id: targetId,
    p_decision: decision,
    p_note: note,
  });
  if (error) return { ok: false, message: dbErrorMessage(error) };
  // Removed content: delete its photos too, so old links stop working (admins may delete any post photo).
  const paths = (removedPaths ?? []).filter((p) => POST_MEDIA_PATH.test(p));
  if (paths.length > 0) {
    const { error: rmError } = await supabase.storage.from("post-media").remove(paths);
    if (rmError) console.error("removed content photo cleanup failed:", rmError.message);
  }
  // Club pages show posts; the app reads the feed live.
  updateTag("posts");
  refresh();
  return { ok: true, message: decision === "approved" ? "Approved. It's live." : "Removed. The person has been told why." };
}

/** Close a report about a person, club or event. */
export async function resolveReportAction(fd: FormData): Promise<void> {
  const reportId = fd.get("reportId");
  const status = fd.get("status");
  if (typeof reportId !== "string" || (status !== "actioned" && status !== "dismissed")) return;
  const supabase = await createServerSupabase();
  await supabase.rpc("resolve_report", { p_report_id: reportId, p_status: status });
  refresh();
}

/** Review switch: "review" = user photos and text wait for a Nikl admin; "publish" = they go out straight away. */
export async function setModerationModeAction(fd: FormData): Promise<void> {
  const mode = fd.get("mode");
  if (mode !== "review" && mode !== "publish") return;
  const supabase = await createServerSupabase();
  await supabase.rpc("set_moderation_mode", { p_mode: mode });
  refresh();
}
