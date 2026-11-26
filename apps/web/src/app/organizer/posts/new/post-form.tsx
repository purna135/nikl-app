"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Field, describedBy } from "@/components/form-field";
import { PosterPicker, type PosterValue } from "@/components/poster-picker";
import type { ActionResult } from "@/lib/errors";
import { createPostAction } from "../../actions";

type Club = { id: string; name: string; review_status: "pending" | "approved" | "rejected" | "suspended" };

export function PostForm({ clubs, clubId, events, userId }: { clubs: Club[]; clubId: string; events: { id: string; title: string }[]; userId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createPostAction, null);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  const [photo, setPhoto] = useState<PosterValue>(null);
  const [caption, setCaption] = useState("");
  const club = clubs.find((c) => c.id === clubId);

  return (
    <form action={action} className="form" noValidate style={{ marginTop: 16 }}>
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="mediaPath" value={photo?.path ?? ""} />

      {clubs.length > 1 && (
        <Field id="club" label="Post as">
          {/* Switching club reloads the page so the event list matches. */}
          <select id="club" className="input" value={clubId} onChange={(e) => router.push(`/organizer/posts/new?club=${e.target.value}`)}>
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
        <p className="hint">Optional. Without a photo, the post shows the event&apos;s poster.</p>
      </section>

      <section className="form-section">
        <h2>Event</h2>
        <Field id="eventId" label="About which event?" optional hint="People can book straight from the post.">
          <select id="eventId" name="eventId" className="input" defaultValue="">
            <option value="">No event (just a photo or update)</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section className="form-section">
        <h2>Caption</h2>
        <Field id="caption" label="Caption" optional error={errors.caption}>
          <textarea
            id="caption"
            name="caption"
            className="input textarea"
            rows={4}
            maxLength={2200}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Lineup drop 🎸 three bands, one rooftop."
            {...describedBy("caption", errors.caption)}
          />
        </Field>
        <p className="hint">{caption.length} / 2,200</p>
      </section>

      {state && !state.ok && (
        <p className="error" role="alert">
          {state.message}
        </p>
      )}
      {club && club.review_status !== "approved" && (
        <p className="notice notice-warn">Your club page is waiting for approval. Posts show up once it&apos;s approved.</p>
      )}
      <div className="form-actions">
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}
