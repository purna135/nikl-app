import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { inTimeWindow } from "@nikl/utils";
import type { Database } from "@nikl/supabase";

/**
 * Public, cacheable reads for Explore, event pages and club pages.
 * Uses the publishable key without cookies, so results are the same for everyone and can be cached.
 * Row-level security still decides what's visible (published events of approved clubs only).
 * Organizer actions call updateTag("events") / updateTag("clubs") so changes show up immediately.
 */

export type ExploreRow = Database["public"]["Functions"]["explore_events"]["Returns"][number];

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || key.startsWith("replace-")) return null;
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Every upcoming public event (next date each), for the next 60 days. */
export async function getUpcomingEvents(): Promise<ExploreRow[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("events");
  const supabase = publicClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("explore_events", {});
  if (error) {
    console.error("explore_events failed:", error.message);
    return [];
  }
  return data ?? [];
}

/** This weekend's events, or the next 7 days when the weekend is empty. */
export async function getWeekendPicks(): Promise<{ title: string; rows: ExploreRow[] }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("events");
  const all = await getUpcomingEvents();
  const now = new Date();
  const weekend = all.filter((r) => inTimeWindow(r.starts_at, r.ends_at, "weekend", now));
  if (weekend.length > 0) return { title: "This weekend", rows: weekend.slice(0, 12) };
  return { title: "Coming up", rows: all.filter((r) => inTimeWindow(r.starts_at, r.ends_at, "week", now)).slice(0, 12) };
}

const EVENT_FIELDS =
  "id, title, slug, status, description, poster_url, category, tags, refund_policy, age_limit, women_only, clubs(name, handle, verified, kind, area, bio), venues(name, address, area, lat, lng), event_occurrences(id, starts_at, ends_at, status, capacity, seats_taken, ticket_tiers(name, price_paise, quantity, sold, position))";

/**
 * One public event with its upcoming dates (scheduled and not over yet, soonest first).
 * The time check runs here, inside the cache, so pages don't read the clock while prerendering.
 */
export async function getEventBySlug(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("events", `event:${slug}`);
  const supabase = publicClient();
  if (!supabase || !/^[a-z0-9-]{3,140}$/.test(slug)) return null;
  const { data, error } = await supabase.from("events").select(EVENT_FIELDS).eq("slug", slug).maybeSingle();
  if (error) console.error("event lookup failed:", error.message);
  if (!data) return null;
  const now = Date.now();
  const upcoming = data.event_occurrences
    .filter((o) => o.status === "scheduled" && new Date(o.ends_at ?? new Date(o.starts_at).getTime() + 2 * 3600_000).getTime() > now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .map((o) => ({ ...o, ticket_tiers: [...o.ticket_tiers].sort((a, b) => a.position - b.position) }));
  return { ...data, upcoming };
}
export type PublicEvent = NonNullable<Awaited<ReturnType<typeof getEventBySlug>>>;

/** A few real slugs to prerender (Cache Components needs at least one). */
export async function getPrerenderSlugs(): Promise<string[]> {
  const rows = await getUpcomingEvents();
  return rows.slice(0, 20).map((r) => r.slug);
}

export async function getClubByHandle(handle: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("clubs", "events", `club:${handle}`);
  const supabase = publicClient();
  if (!supabase || !/^[a-z0-9._]{3,30}$/.test(handle)) return null;
  const { data: club } = await supabase
    .from("clubs")
    .select("id, name, handle, kind, category, area, bio, verified, rating_avg, rating_count")
    .eq("handle", handle)
    .maybeSingle();
  if (!club) return null;
  const events = (await getUpcomingEvents()).filter((r) => r.club_handle === club.handle);
  return { club, events };
}

export async function getPrerenderHandles(): Promise<string[]> {
  const rows = await getUpcomingEvents();
  return [...new Set(rows.map((r) => r.club_handle))].slice(0, 20);
}
