// Poster-to-event: reads an organizer's uploaded poster and returns event details for the form.
//
// POST { posterPath: "<user-id>/<file>.jpg" }  (path inside the public "posters" bucket)
// → { fields: { title, category, date, startTime, endTime, venueName, venueArea, pricePaise, description }, source }
// → { error, message }   (HTTP 200, so the form can show the message)
//
// Model: Claude Haiku 5.5 by default (DECISIONS.md T8: cheap and fast for posters); set POSTER_AI_MODEL to change it.
// Secrets: ANTHROPIC_API_KEY (set with `supabase secrets set`, or supabase/functions/.env locally; never in git).
// Local testing without a key: POSTER_AI_MOCK=true returns sample fields.

import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import Anthropic from "npm:@anthropic-ai/sdk@1.6.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@1.6.0/helpers/zod";
import { z } from "npm:zod@4.6.7";

// Mirrors packages/utils/src/categories.ts (CATEGORIES and BBSR_AREAS). Keep in sync.
const CATEGORY_IDS = ["fitness", "art", "music", "comedy", "food", "outdoors", "games", "learn", "dance", "markets", "social", "wellness"] as const;
const AREAS = ["Patia", "Chandrasekharpur", "Saheed Nagar", "Jaydev Vihar", "Nayapalli", "Old Town", "Khandagiri", "Kharavel Nagar"] as const;

const MODEL = Deno.env.get("POSTER_AI_MODEL") ?? "claude-haiku-5-5";
const DAILY_LIMIT = Number(Deno.env.get("POSTER_AI_DAILY_LIMIT") ?? "30");
// Server-side client (service role is provided by Supabase to every function; never sent to apps).
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const MAX_BYTES = 5 * 1024 * 1024;
const PATH_RE = /^([0-9a-f-]{36})\/[0-9a-f-]{36}\.(jpg|png|webp)$/i;
const MEDIA_TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const fail = (error: string, message: string) => json({ error, message });

/** What we ask Claude to fill in. Unknown values come back as null, never guessed. */
const PosterSchema = z.object({
  is_event_poster: z.boolean().describe("False if the image is not an event poster or flyer."),
  title: z.string().nullable().describe("Event name as printed, in normal capitalisation."),
  category: z.enum(CATEGORY_IDS).nullable(),
  date: z.string().nullable().describe("First (or only) date, as YYYY-MM-DD."),
  start_time: z.string().nullable().describe("24-hour HH:MM."),
  end_time: z.string().nullable().describe("24-hour HH:MM, only if printed."),
  venue_name: z.string().nullable(),
  area: z.enum(AREAS).nullable().describe("Bhubaneswar neighbourhood, only if clearly stated or obvious from the venue."),
  price_rupees: z.number().nullable().describe("Lowest regular ticket price in rupees. 0 if the poster says free entry. Null if no price is shown."),
  description: z.string().nullable().describe("One or two plain sentences built only from what the poster says."),
});

const SYSTEM = `You read posters for Nikl, an events app in Bhubaneswar, Odisha, India, and fill in an event form.
Use only what the poster shows. If something isn't on the poster, return null for it. Never invent details.
Dates and times are in India Standard Time. Resolve dates without a year to the next occurrence on or after today.
Categories: fitness (runs, sports, yoga), art (painting, pottery, craft), music (gigs, open jams), comedy (stand-up, open mic, theatre, poetry),
food (food walks, pop-ups, cooking), outdoors (treks, trips, nature walks), games (board games, quizzes), learn (talks, book clubs, workshops for skills),
dance, markets (flea markets, exhibitions, fests), social (volunteering, cleanups), wellness (meditation, sound baths).`;

/** Base64 for Claude's image block, built in chunks so big posters don't overflow the call stack. */
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** The signed-in caller, verified with Supabase Auth (never trust an unverified token). */
async function callerId(req: Request): Promise<string | null> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || token.split(".").length !== 3) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error || !data.user ? null : data.user.id;
}

const SAMPLE = {
  title: "Sunday Long Run: 10K",
  category: "fitness",
  date: null as string | null,
  startTime: "05:45",
  endTime: "07:30",
  venueName: "Infocity Square",
  venueArea: "Patia",
  pricePaise: 0,
  description: "An easy-paced 10K with pace groups for every speed. Filter coffee after the run.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let posterPath: unknown;
  try {
    ({ posterPath } = await req.json());
  } catch {
    return fail("bad_request", "Send the poster path as JSON.");
  }
  const uid = await callerId(req);
  if (!uid) return json({ error: "unauthorized", message: "Log in to read posters." }, 401);
  const match = typeof posterPath === "string" ? PATH_RE.exec(posterPath) : null;
  if (!match) return fail("bad_request", "That doesn't look like a Nikl poster upload.");
  if (match[1]!.toLowerCase() !== uid.toLowerCase()) {
    return fail("forbidden", "You can only read posters you uploaded.");
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    if (Deno.env.get("POSTER_AI_MOCK") === "true") {
      const next = new Date(Date.now() + 8 * 864e5).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      return json({ fields: { ...SAMPLE, date: next }, source: "sample" });
    }
    return fail("not_configured", "Poster reading isn't switched on yet. Fill in the details yourself for now.");
  }

  const { data: allowed, error: limitError } = await admin.rpc("bump_poster_ai_usage", { p_user_id: uid, p_limit: DAILY_LIMIT });
  if (limitError) {
    console.error("extract-event: usage limit check failed", limitError.message);
    return fail("ai_error", "Couldn't read the poster right now. Fill in the details yourself.");
  }
  if (!allowed) return fail("limit", `You've read ${DAILY_LIMIT} posters today. Fill in the details yourself, or try again tomorrow.`);

  // Download the poster through Supabase's own address (inside Docker locally, the public URL in the cloud)
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const ext = match[2]!.toLowerCase() as keyof typeof MEDIA_TYPES;
  const res = await fetch(`${supabaseUrl}/storage/v1/object/public/posters/${posterPath}`);
  if (!res.ok) return fail("not_found", "Couldn't open the poster. Try uploading it again.");
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length > MAX_BYTES) return fail("too_large", "Keep the poster under 5 MB.");

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const client = new Anthropic({ apiKey });
  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(PosterSchema) },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: MEDIA_TYPES[ext], data: toBase64(bytes) } },
            { type: "text", text: `Today is ${today}. Fill in the event form from this poster.` },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") return fail("unreadable", "Couldn't read this poster. Fill in the details yourself.");
    const p = response.parsed_output;
    if (!p) return fail("unreadable", "Couldn't read this poster. Fill in the details yourself.");
    if (!p.is_event_poster) return fail("not_a_poster", "That image doesn't look like an event poster.");

    const time = (t: string | null) => (t && /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? t : undefined);
    const fields = {
      title: p.title?.trim().slice(0, 120) || undefined,
      category: p.category ?? undefined,
      date: p.date && /^\d{4}-\d{2}-\d{2}$/.test(p.date) && p.date >= today ? p.date : undefined,
      startTime: time(p.start_time),
      endTime: time(p.end_time),
      venueName: p.venue_name?.trim().slice(0, 120) || undefined,
      venueArea: p.area ?? undefined,
      pricePaise: typeof p.price_rupees === "number" && p.price_rupees >= 0 ? Math.round(p.price_rupees * 100) : undefined,
      description: p.description?.trim().slice(0, 1000) || undefined,
    };
    return json({ fields, source: "claude" });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return fail("busy", "Poster reading is busy. Try again in a minute.");
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("extract-event: Anthropic key rejected");
      return fail("not_configured", "Poster reading isn't set up correctly yet. Fill in the details yourself.");
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`extract-event: Anthropic API error ${err.status}`, err.message);
      return fail("ai_error", "Couldn't read the poster right now. Fill in the details yourself.");
    }
    console.error("extract-event: unexpected error", err);
    return fail("ai_error", "Couldn't read the poster right now. Fill in the details yourself.");
  }
});
