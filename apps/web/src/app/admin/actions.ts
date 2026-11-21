"use server";

import { refresh, updateTag } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { dbErrorMessage, type ActionResult } from "@/lib/errors";

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
