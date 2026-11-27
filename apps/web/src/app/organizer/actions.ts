"use server";

import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";
import { clubFormSchema, eventFormSchema } from "@nikl/validation";
import { createServerSupabase } from "@/lib/supabase/server";
import { dbErrorMessage, fieldErrorsFrom, type ActionResult } from "@/lib/errors";
import { POST_MEDIA_PATH } from "@/lib/media";

const text = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
};
const int = (fd: FormData, key: string) => {
  const v = text(fd, key);
  return v === undefined ? undefined : Number(v);
};
const num = (fd: FormData, key: string) => {
  const v = text(fd, key);
  const n = v === undefined ? undefined : Number.parseFloat(v);
  return n === undefined || Number.isNaN(n) ? undefined : n;
};

/** Public pages (home, Explore, event and club pages) are cached; this shows organizer changes right away. */
function refreshPublic() {
  updateTag("events");
}

/** Poster URLs must be uploads in our own "posters" bucket, never an arbitrary site. */
const POSTER_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/posters/`;
const POSTER_FILE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i;
function posterOk(url: string | undefined): boolean {
  return url === undefined || (url.startsWith(POSTER_PREFIX) && POSTER_FILE.test(url.slice(POSTER_PREFIX.length)));
}

/** Sends the organizer back to the event page with a message, for the plain (non-JS-state) forms. */
function backWithError(eventId: string, message: string): never {
  redirect(`/organizer/events/${eventId}?error=${encodeURIComponent(message)}`);
}

async function signedIn() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

/** "Create your club page". The page starts hidden until a Nikl admin approves it. */
export async function createClubAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = clubFormSchema.safeParse({
    name: text(fd, "name"),
    handle: text(fd, "handle"),
    category: text(fd, "category"),
    kind: text(fd, "kind"),
    area: text(fd, "area"),
    bio: text(fd, "bio"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, message: "Your session expired. Log in again." };

  const c = parsed.data;
  const { error } = await supabase.rpc("create_club", {
    p_name: c.name,
    p_handle: c.handle,
    p_category: c.category,
    p_kind: c.kind,
    p_area: c.area,
    p_bio: c.bio,
  });
  if (error) return { ok: false, message: dbErrorMessage(error) };
  redirect("/organizer");
}

/** "New event": event + weekly dates + ticket types in one database transaction. */
export async function createEventAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let tiers: unknown = [];
  try {
    tiers = JSON.parse(text(fd, "tiers") ?? "[]");
  } catch {
    return { ok: false, message: "Ticket details couldn't be read. Try again." };
  }
  const parsed = eventFormSchema.safeParse({
    clubId: text(fd, "clubId"),
    title: text(fd, "title"),
    category: text(fd, "category"),
    description: text(fd, "description"),
    posterUrl: text(fd, "posterUrl"),
    startsAt: text(fd, "startsAt"),
    endsAt: text(fd, "endsAt"),
    venueName: text(fd, "venueName"),
    venueAddress: text(fd, "venueAddress"),
    venueArea: text(fd, "venueArea"),
    venueLat: num(fd, "venueLat"),
    venueLng: num(fd, "venueLng"),
    capacity: int(fd, "capacity"),
    repeatWeeks: int(fd, "repeatWeeks") ?? 1,
    tiers,
    publish: fd.get("intent") === "publish",
  });
  if (!parsed.success) {
    return { ok: false, message: "Check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  if (!posterOk(parsed.data.posterUrl)) return { ok: false, message: "Upload the poster again." };
  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, message: "Your session expired. Log in again." };

  const e = parsed.data;
  const { data: eventId, error } = await supabase.rpc("create_event", {
    p_club_id: e.clubId,
    p_title: e.title,
    p_category: e.category,
    p_starts_at: e.startsAt,
    p_ends_at: e.endsAt,
    p_description: e.description,
    p_poster_url: e.posterUrl,
    p_venue_name: e.venueName,
    p_venue_address: e.venueAddress,
    p_venue_area: e.venueArea,
    p_venue_lat: e.venueLat,
    p_venue_lng: e.venueLng,
    p_capacity: e.capacity,
    p_repeat_weeks: e.repeatWeeks,
    p_tiers: e.tiers.map((t) => ({ name: t.name, price_paise: t.pricePaise, quantity: t.quantity ?? null })),
    p_publish: e.publish,
  });
  if (error || !eventId) return { ok: false, message: dbErrorMessage(error) };
  refreshPublic();
  redirect(`/organizer/events/${eventId}?created=1`);
}

/** Edit an event's main details. Dates and tickets are managed per date for now. */
export async function updateEventAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = text(fd, "eventId");
  const title = text(fd, "title");
  const category = text(fd, "category");
  if (!id) return { ok: false, message: "Missing event." };
  if (!title || title.length < 3) return { ok: false, message: "Check the highlighted fields.", fieldErrors: { title: "Give the event a name (at least 3 characters)." } };
  if (!category) return { ok: false, message: "Check the highlighted fields.", fieldErrors: { category: "Pick a category." } };

  const posterUrl = text(fd, "posterUrl");
  if (!posterOk(posterUrl)) return { ok: false, message: "Upload the poster again." };

  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, message: "Your session expired. Log in again." };
  const { data, error } = await supabase
    .from("events")
    .update({ title, category, description: text(fd, "description") ?? null, poster_url: posterUrl ?? null })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, message: dbErrorMessage(error) };
  if (!data?.length) return { ok: false, message: "You can't edit this event." };
  refreshPublic();
  refresh();
  return { ok: true, message: "Saved." };
}

/** Club post: optional photo (already uploaded to the user's own folder), optional event, caption. */
export async function createPostAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const clubId = text(fd, "clubId");
  const caption = text(fd, "caption");
  const eventId = text(fd, "eventId");
  const mediaPath = text(fd, "mediaPath");
  if (!clubId) return { ok: false, message: "Missing club." };
  if (caption && caption.length > 2200) {
    return { ok: false, message: "Check the highlighted fields.", fieldErrors: { caption: "Keep it under 2,200 characters." } };
  }
  if (!caption && !eventId && !mediaPath) return { ok: false, message: "Add a photo, pick an event, or write something." };
  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, message: "Your session expired. Log in again." };
  if (mediaPath && (!POST_MEDIA_PATH.test(mediaPath) || !mediaPath.startsWith(`${user.id}/`))) {
    return { ok: false, message: "Upload the photo again." };
  }
  const { error } = await supabase.rpc("create_club_post", {
    p_club_id: clubId,
    p_caption: caption,
    p_event_id: eventId,
    p_media_paths: mediaPath ? [mediaPath] : [],
  });
  if (error) return { ok: false, message: dbErrorMessage(error) };
  updateTag("posts");
  redirect(`/organizer?club=${clubId}&posted=1`);
}

/** Delete one of the club's posts, and its photos from storage so old links stop working. */
export async function deletePostAction(fd: FormData): Promise<void> {
  const id = text(fd, "postId");
  const clubId = text(fd, "clubId");
  if (!id) return;
  const back = (error?: string) =>
    redirect(`/organizer?${new URLSearchParams({ ...(clubId ? { club: clubId } : {}), ...(error ? { error } : {}) })}`);
  const { supabase, user } = await signedIn();
  if (!user) redirect("/login?next=/organizer");

  const { data: media } = await supabase.from("post_media").select("url").eq("post_id", id);
  const { data, error } = await supabase.from("posts").delete().eq("id", id).eq("author_type", "club").select("id");
  if (error || !data?.length) back(error ? dbErrorMessage(error) : "Only the club's owners and admins can delete posts.");

  // Files live in the uploader's own folder; storage rules only let them remove their own.
  const paths = (media ?? []).map((m) => m.url).filter((p) => POST_MEDIA_PATH.test(p));
  if (paths.length > 0) {
    const { error: rmError } = await supabase.storage.from("post-media").remove(paths);
    if (rmError) console.error("post photo cleanup failed:", rmError.message);
  }
  updateTag("posts");
  back();
}

/** Club story: a photo, an event card, or both. Live for 24 hours (club content publishes straight away, P17). */
export async function createStoryAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const clubId = text(fd, "clubId");
  const eventId = text(fd, "eventId");
  const mediaPath = text(fd, "mediaPath");
  if (!clubId) return { ok: false, message: "Missing club." };
  if (!eventId && !mediaPath) return { ok: false, message: "Add a photo or pick an event." };
  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, message: "Your session expired. Log in again." };
  if (mediaPath && (!POST_MEDIA_PATH.test(mediaPath) || !mediaPath.startsWith(`${user.id}/`))) {
    return { ok: false, message: "Upload the photo again." };
  }
  const { error } = await supabase.rpc("create_club_story", { p_club_id: clubId, p_media_path: mediaPath, p_event_id: eventId });
  if (error) return { ok: false, message: dbErrorMessage(error) };
  redirect(`/organizer?club=${clubId}&story=1`);
}

/** Delete one of the club's stories (and its photo file). */
export async function deleteStoryAction(fd: FormData): Promise<void> {
  const id = text(fd, "storyId");
  const clubId = text(fd, "clubId");
  if (!id) return;
  const back = (error?: string) =>
    redirect(`/organizer?${new URLSearchParams({ ...(clubId ? { club: clubId } : {}), ...(error ? { error } : {}) })}`);
  const { supabase, user } = await signedIn();
  if (!user) redirect("/login?next=/organizer");
  const { data, error } = await supabase.from("stories").delete().eq("id", id).eq("author_type", "club").select("media_url");
  if (error || !data?.length) back(error ? dbErrorMessage(error) : "Only the club's owners and admins can delete stories.");
  const path = data?.[0]?.media_url;
  if (path && POST_MEDIA_PATH.test(path)) {
    const { error: rmError } = await supabase.storage.from("post-media").remove([path]);
    if (rmError) console.error("story photo cleanup failed:", rmError.message);
  }
  back();
}

/** Add, move or remove an event's map pin (the database gives the event its own venue copy). */
export async function setEventPinAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = text(fd, "eventId");
  if (!id) return { ok: false, message: "Missing event." };
  const lat = num(fd, "venueLat") ?? null;
  const lng = num(fd, "venueLng") ?? null;
  if ((lat === null) !== (lng === null)) return { ok: false, message: "Drop the map pin again." };
  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, message: "Your session expired. Log in again." };
  const { error } = await supabase.rpc("set_event_pin", { p_event_id: id, p_lat: lat ?? undefined, p_lng: lng ?? undefined });
  if (error) return { ok: false, message: dbErrorMessage(error) };
  refreshPublic();
  refresh();
  return { ok: true, message: lat === null ? "Pin removed." : "Pin saved. It shows on the map now." };
}

/** Publish, move back to draft, cancel, or restore an event. */
export async function setEventStatusAction(fd: FormData): Promise<void> {
  const id = text(fd, "eventId");
  const status = text(fd, "status");
  if (!id || (status !== "published" && status !== "draft" && status !== "cancelled")) return;
  const { supabase, user } = await signedIn();
  if (!user) redirect(`/login?next=/organizer/events/${id}`);

  const { data: current } = await supabase.from("events").select("status").eq("id", id).maybeSingle();
  if (!current) backWithError(id, "You can't change this event.");

  const patch: { status: typeof status; published_at?: string } = { status };
  if (status === "published") patch.published_at = new Date().toISOString();
  const { data, error } = await supabase.from("events").update(patch).eq("id", id).select("id");
  if (error || !data?.length) backWithError(id, error ? dbErrorMessage(error) : "You can't change this event.");

  const now = new Date().toISOString();
  if (status === "cancelled") {
    await supabase.from("event_occurrences").update({ status: "cancelled" }).eq("event_id", id).eq("status", "scheduled");
  } else if (status === "published" && current.status === "cancelled") {
    // Restoring a cancelled event brings back its future dates too.
    await supabase.from("event_occurrences").update({ status: "scheduled" }).eq("event_id", id).eq("status", "cancelled").gt("starts_at", now);
  }
  refreshPublic();
  refresh();
}

/** Cancel (or restore) one date of a repeating event. */
export async function setOccurrenceStatusAction(fd: FormData): Promise<void> {
  const id = text(fd, "occurrenceId");
  const eventId = text(fd, "eventId");
  const status = text(fd, "status");
  if (!id || !eventId || (status !== "cancelled" && status !== "scheduled")) return;
  const { supabase, user } = await signedIn();
  if (!user) redirect(`/login?next=/organizer/events/${eventId}`);
  const { data, error } = await supabase.from("event_occurrences").update({ status }).eq("id", id).select("id");
  if (error || !data?.length) backWithError(eventId, error ? dbErrorMessage(error) : "You can't change this date.");
  refreshPublic();
  refresh();
}

/** Delete an event that was never published. */
export async function deleteDraftAction(fd: FormData): Promise<void> {
  const id = text(fd, "eventId");
  if (!id) return;
  const { supabase, user } = await signedIn();
  if (!user) redirect(`/login?next=/organizer/events/${id}`);
  const { data, error } = await supabase.from("events").delete().eq("id", id).eq("status", "draft").select("id");
  if (error || !data?.length) backWithError(id, error ? dbErrorMessage(error) : "Only drafts you manage can be deleted.");
  redirect("/organizer");
}
