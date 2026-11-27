"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/form-field";
import { PosterPicker, type PosterValue } from "@/components/poster-picker";
import type { ActionResult } from "@/lib/errors";
import { createStoryAction } from "../../actions";

type Club = { id: string; name: string; review_status: "pending" | "approved" | "rejected" | "suspended" };

export function StoryForm({ clubs, clubId, events, userId }: { clubs: Club[]; clubId: string; events: { id: string; title: string }[]; userId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createStoryAction, null);
  const [photo, setPhoto] = useState<PosterValue>(null);
  const club = clubs.find((c) => c.id === clubId);

  return (
    <form action={action} className="form" noValidate style={{ marginTop: 16 }}>
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="mediaPath" value={photo?.path ?? ""} />

      {clubs.length > 1 && (
        <Field id="club" label="Story for">
          <select id="club" className="input" value={clubId} onChange={(e) => router.push(`/organizer/stories/new?club=${e.target.value}`)}>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <section className="form-section">
        <h2>Photo</h2>
        <PosterPicker userId={userId} value={photo} onChange={setPhoto} bucket="post-media" noun="photo" />
        <p className="hint">Tall photos (9:16) fill the screen best. Optional if you pick an event.</p>
      </section>

      <section className="form-section">
        <h2>Event</h2>
        <Field id="eventId" label="Add a Book button for" optional hint="People can open and book the event from the story.">
          <select id="eventId" name="eventId" className="input" defaultValue="">
            <option value="">No event</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </Field>
      </section>

      {state && !state.ok && (
        <p className="error" role="alert">
          {state.message}
        </p>
      )}
      {club && club.review_status !== "approved" && (
        <p className="notice notice-warn">Your club page is waiting for approval. Stories show up once it&apos;s approved (they last 24 hours).</p>
      )}
      <div className="form-actions">
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? "Sharing…" : "Share story"}
        </button>
      </div>
    </form>
  );
}
