/** Error codes our database functions raise with a human-readable message (see supabase/migrations). */
const FRIENDLY_CODES = new Set(["P0001", "P0002", "22023", "23505", "42501"]);

/** Turns a Supabase/Postgres error into a short message for the person using the form. */
export function dbErrorMessage(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return "Something went wrong. Please try again.";
  // A unique index (not our own check) won the race: don't show Postgres's raw text.
  if (error.code === "23505" && /duplicate key/i.test(error.message ?? "")) {
    return "That's already taken. Try another one.";
  }
  if (error.code && FRIENDLY_CODES.has(error.code) && error.message) {
    if (error.code === "42501" && /permission denied/i.test(error.message)) {
      return "You don't have permission to do that.";
    }
    return error.message;
  }
  if (error.code === "23514") return "Some details aren't valid. Check the form and try again.";
  return "Something went wrong. Please try again.";
}

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string; fieldErrors?: Record<string, string> };

/** Flattens zod issues into { field: firstMessage }. */
export function fieldErrorsFrom(issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "_";
    out[key] ??= issue.message;
  }
  return out;
}
