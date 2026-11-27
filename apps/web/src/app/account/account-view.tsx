"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatIndianPhone } from "@nikl/utils";
import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";

type View = { state: "loading" } | { state: "signed-out" } | { state: "signed-in"; id: string; phone: string | null };

export function AccountView() {
  const router = useRouter();
  const [view, setView] = useState<View>({ state: "loading" });

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const user = data.user;
      setView(user ? { state: "signed-in", id: user.id, phone: user.phone ? `+${user.phone}` : null } : { state: "signed-out" });
    });
    return () => {
      active = false;
    };
  }, []);

  async function signOut() {
    await getSupabase()?.auth.signOut();
    router.replace("/");
  }

  if (!supabaseConfigured) {
    return (
      <div className="card">
        <h1>Not connected</h1>
        <p>Set the Supabase values in apps/web/.env.local first.</p>
      </div>
    );
  }

  if (view.state === "loading") {
    return (
      <div className="card" aria-busy="true">
        <p>Loading your account…</p>
      </div>
    );
  }

  if (view.state === "signed-out") {
    return (
      <div className="card">
        <h1>You&apos;re not logged in</h1>
        <p>Log in with your phone number to see your account.</p>
        <Link className="btn primary block" href="/login">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <span className="ok-badge" aria-hidden="true">✓</span>
      <h1>You&apos;re in</h1>
      <p>Login works. Your profile, tickets and saved plans will live here.</p>
      <dl className="kv">
        <dt>Phone</dt>
        <dd>{view.phone ? formatIndianPhone(view.phone) : "Not available"}</dd>
        <dt>User ID</dt>
        <dd>{view.id}</dd>
      </dl>
      <Link className="btn primary block" href="/tickets">
        Your tickets
      </Link>
      <Link className="btn block" href="/account/setup">
        Edit your profile
      </Link>
      <Link className="btn dark block" href="/organizer">
        Organizer dashboard
      </Link>
      <button className="btn block" onClick={signOut}>
        Log out
      </button>
    </div>
  );
}
