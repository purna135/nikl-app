"use client";

import { useActionState, useState } from "react";
import { CATEGORIES } from "@nikl/utils";
import { Field, describedBy } from "@/components/form-field";
import { PosterPicker, type PosterValue } from "@/components/poster-picker";
import type { ActionResult } from "@/lib/errors";
import { updateEventAction } from "../../actions";

type Props = {
  userId: string;
  event: { id: string; title: string; category: string; description: string; posterUrl: string | null };
};

export function EditEventForm({ userId, event }: Props) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updateEventAction, null);
  const [poster, setPoster] = useState<PosterValue>(event.posterUrl ? { url: event.posterUrl, path: "" } : null);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form action={action} className="form" noValidate>
      <input type="hidden" name="eventId" value={event.id} />
      <input type="hidden" name="posterUrl" value={poster?.url ?? ""} />
      <PosterPicker userId={userId} value={poster} onChange={setPoster} />
      <Field id="title" label="Event name" error={errors.title}>
        <input id="title" name="title" className="input" defaultValue={event.title} maxLength={120} {...describedBy("title", errors.title)} />
      </Field>
      <Field id="category" label="Category" error={errors.category}>
        <select id="category" name="category" className="input" defaultValue={event.category}>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field id="description" label="Description" optional>
        <textarea id="description" name="description" className="input textarea" rows={4} maxLength={5000} defaultValue={event.description} />
      </Field>
      {state && (
        <p className={state.ok ? "notice notice-good" : "error"} role={state.ok ? "status" : "alert"}>
          {state.message}
        </p>
      )}
      <div className="form-actions">
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
