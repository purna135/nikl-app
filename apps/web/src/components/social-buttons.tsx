"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";

/**
 * Follow and Save on the (cached, public) club and event pages. The page itself is the same for
 * everyone; these buttons load the visitor's own state in the browser after the page shows.
 * Taps update straight away and roll back if the server says no (DECISIONS.md P18).
 */

async function currentUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

const formatCount = (n: number) => new Intl.NumberFormat("en-IN", { notation: n >= 10000 ? "compact" : "standard" }).format(n);

export function FollowButton({ clubId, handle }: { clubId: string; handle: string }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let active = true;
    void (async () => {
      const uid = await currentUserId();
      const [{ count }, mine] = await Promise.all([
        supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("target_type", "club").eq("target_id", clubId),
        uid
          ? supabase.from("follows").select("follower_id").eq("follower_id", uid).eq("target_type", "club").eq("target_id", clubId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (!active) return;
      setUserId(uid);
      setFollowers(count ?? 0);
      setFollowing(Boolean(mine.data));
    })();
    return () => {
      active = false;
    };
  }, [clubId]);

  async function toggle() {
    const supabase = getSupabase();
    if (!supabase) return;
    if (!userId) {
      router.push(`/login?next=${encodeURIComponent(`/c/${handle}`)}`);
      return;
    }
    const next = !following;
    setError(null);
    setBusy(true);
    setFollowing(next);
    setFollowers((n) => (n === null ? n : Math.max(0, n + (next ? 1 : -1))));
    const { error: err } = await supabase.rpc("set_follow_club", { p_club_id: clubId, p_on: next });
    setBusy(false);
    if (err) {
      setFollowing(!next);
      setFollowers((n) => (n === null ? n : Math.max(0, n + (next ? -1 : 1))));
      setError("That didn't work. Try again.");
    }
  }

  return (
    <div className="follow-box">
      <button
        type="button"
        className={`btn ${following ? "" : "primary"}`}
        onClick={toggle}
        disabled={busy || userId === undefined}
        aria-pressed={following}
      >
        {following ? "Following" : "Follow"}
      </button>
      {followers !== null && (
        <span className="muted small">
          <strong className="count">{formatCount(followers)}</strong> {followers === 1 ? "follower" : "followers"}
        </span>
      )}
      {error && (
        <span className="error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function SaveButton({ eventId, slug }: { eventId: string; slug: string }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let active = true;
    void (async () => {
      const uid = await currentUserId();
      const mine = uid
        ? await supabase.from("saves").select("event_id").eq("user_id", uid).eq("event_id", eventId).maybeSingle()
        : { data: null };
      if (!active) return;
      setUserId(uid);
      setSaved(Boolean(mine.data));
    })();
    return () => {
      active = false;
    };
  }, [eventId]);

  async function toggle() {
    const supabase = getSupabase();
    if (!supabase) return;
    if (!userId) {
      router.push(`/login?next=${encodeURIComponent(`/e/${slug}`)}`);
      return;
    }
    const next = !saved;
    setError(null);
    setBusy(true);
    setSaved(next);
    const { error: err } = await supabase.rpc("set_save", { p_event_id: eventId, p_on: next });
    setBusy(false);
    if (err) {
      setSaved(!next);
      setError("That didn't work. Try again.");
    }
  }

  return (
    <>
      <button type="button" className="btn" onClick={toggle} disabled={busy || userId === undefined} aria-pressed={saved}>
        {saved ? "🔖 Saved" : "Save"}
      </button>
      {error && (
        <span className="error" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
