"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/errors";
import { moderateAction } from "../actions";

/** Approve or remove one post or story. Removing asks for a reason, which the person sees. */
export function ModerateForm({ targetType, targetId }: { targetType: "post" | "story"; targetId: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(moderateAction, null);
  if (state?.ok) {
    return (
      <p className="notice notice-good" role="status">
        {state.message}
      </p>
    );
  }
  return (
    <form action={action} className="review-form">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <label className="sr-only" htmlFor={`note-${targetId}`}>
        Reason, shown to the person if you remove it
      </label>
      <textarea
        id={`note-${targetId}`}
        name="note"
        className="input textarea"
        rows={2}
        maxLength={300}
        placeholder="Reason (needed to remove; the person sees it)"
      />
      <div className="actions-row">
        <button className="btn primary" type="submit" name="decision" value="approved" disabled={pending}>
          Approve
        </button>
        <button className="btn danger" type="submit" name="decision" value="rejected" disabled={pending}>
          Remove
        </button>
      </div>
      {state && !state.ok && (
        <p className="error" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
