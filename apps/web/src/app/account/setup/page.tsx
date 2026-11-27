import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { ProfileSetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Set up your profile", robots: { index: false, follow: false } };

/** Web profile set-up (DECISIONS.md P16): the same rules as the app, needed before booking. */
export default function SetupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <>
      <SiteHeader action="none" />
      <main className="wrap auth">
        <Suspense fallback={<div className="skeleton" style={{ height: 420, width: "100%", maxWidth: 400 }} />}>
          <Setup searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function Setup({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, { supabase, user }] = await Promise.all([searchParams, requireUser("/account/setup")]);
  const [{ data: profile }, { data: priv }] = await Promise.all([
    supabase.from("profiles").select("name, username, area, interests").eq("id", user.id).maybeSingle(),
    supabase.from("profiles_private").select("dob_year").eq("id", user.id).maybeSingle(),
  ]);
  // Only paths on this site can be returned to.
  const back = next && /^\/(?!\/)[\w\-./?=&%]*$/.test(next) ? next : "/account";
  return (
    <ProfileSetupForm
      next={back}
      initial={{
        name: profile?.name ?? "",
        username: profile?.username ?? "",
        area: profile?.area ?? "",
        interests: profile?.interests ?? [],
        dobYear: priv?.dob_year ? String(priv.dob_year) : "",
      }}
    />
  );
}
