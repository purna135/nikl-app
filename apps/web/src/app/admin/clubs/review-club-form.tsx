"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/errors";
import { reviewClubAction } from "../actions";

export function ReviewClubForm({ clubId }: { clubId: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(reviewClubAction, null);
  return (
    <form action={action} className="review-form">
      <input type="hidden" name="clubId" value={clubId} />
      <label className="sr-only" htmlFor={`note-${clubId}`}>
        Note for the organizer
      </label>
      <textarea
        id={`note-${clubId}`}
        name="note"
        className="input textarea"
        rows={2}
        maxLength={500}
        placeholder="Note for the organizer (needed if you ask for changes)"
      />
      <div className="actions-row">
        <button className="btn primary" type="submit" name="decision" value="approved" disabled={pending}>
          Approve
        </button>
        <button className="btn" type="submit" name="decision" value="rejected" disabled={pending}>
          Ask for changes
        </button>
      </div>
      {state && (
        <p className={state.ok ? "notice notice-good" : "error"} role={state.ok ? "status" : "alert"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
