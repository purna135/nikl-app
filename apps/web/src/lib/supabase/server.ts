import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database, NiklClient } from "@nikl/supabase";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Supabase client for Server Components and Server Actions, using the request's cookies.
 * With Cache Components, call this only inside a <Suspense> boundary (it reads cookies).
 */
export async function createServerSupabase(): Promise<NiklClient> {
  if (!url || !publishableKey) throw new Error("Supabase env vars are missing (see .env.example).");
  const cookieStore = await cookies();
  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy refreshes them.
        }
      },
    },
  });
}
