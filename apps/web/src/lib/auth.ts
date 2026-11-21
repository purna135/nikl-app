import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { NiklClient } from "@nikl/supabase";
import { createServerSupabase } from "@/lib/supabase/server";

/** The signed-in user (verified with Supabase Auth), or null. Call inside <Suspense>. */
export async function getCurrentUser(): Promise<{ supabase: NiklClient; user: User | null }> {
  // Session work is per-request: stop prerendering here (Supabase's client reads the clock on start-up).
  await connection();
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

/** Like getCurrentUser, but sends people to the login page (and back here afterwards). */
export async function requireUser(returnTo: string): Promise<{ supabase: NiklClient; user: User }> {
  const { supabase, user } = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return { supabase, user };
}

/** Whether the signed-in user is a Nikl admin (platform_admins table). */
export async function isPlatformAdmin(supabase: NiklClient): Promise<boolean> {
  const { data } = await supabase.rpc("is_platform_admin");
  return data === true;
}
