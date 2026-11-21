"use client";

import { createBrowserClient } from "@supabase/ssr";
import { isConfigured, type Database, type NiklClient } from "@nikl/supabase";

// Read with dot notation so Next inlines the public values at build time.
const env = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};

let client: NiklClient | null = null;

/** Whether the public Supabase values are set (safe to check during server rendering). */
export const supabaseConfigured = isConfigured(env);

/**
 * Browser Supabase client. The session lives in cookies (via @supabase/ssr), so server code
 * can read it later. Returns null when the env vars aren't set yet, so pages can explain that.
 */
export function getSupabase(): NiklClient | null {
  if (!isConfigured(env)) return null;
  client ??= createBrowserClient<Database>(env.url, env.publishableKey);
  return client;
}
