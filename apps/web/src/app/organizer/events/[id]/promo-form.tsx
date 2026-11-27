"use client";

import { useActionState } from "react";
import { Field, describedBy } from "@/components/form-field";
import type { ActionResult } from "@/lib/errors";
import { createPromoAction } from "../../actions";

/** New promo code. People type it on the booking page; the database checks it (DECISIONS.md P26). */
export function PromoForm({ clubId, eventId }: { clubId: string; eventId: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createPromoAction, null);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} className="form">
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="eventId" value={eventId} />
      <div className="three">
        <Field id="code" label="Code" error={errors.code}>
          <input id="code" name="code" className="input" maxLength={20} placeholder="EARLY10" style={{ textTransform: "uppercase" }} {...describedBy("code", errors.code)} />
        </Field>
        <Field id="kind" label="Discount" error={errors.kind}>
          <select id="kind" name="kind" className="input" defaultValue="percent">
            <option value="percent">% off</option>
            <option value="amount">₹ off</option>
          </select>
        </Field>
        <Field id="value" label="How much" error={errors.value}>
          <input id="value" name="value" className="input" inputMode="decimal" placeholder="10" {...describedBy("value", errors.value)} />
        </Field>
      </div>
      <div className="two">
        <Field id="maxUses" label="Use limit" optional hint="Leave empty for no limit." error={errors.maxUses}>
          <input id="maxUses" name="maxUses" className="input" inputMode="numeric" {...describedBy("maxUses", errors.maxUses)} />
        </Field>
        <Field id="validUntil" label="Works until" optional hint="Last day it works (India time).">
          <input id="validUntil" name="validUntil" className="input" type="date" />
        </Field>
      </div>
      <label className="check">
        <input type="checkbox" name="allEvents" /> Works for all of the club&apos;s events
      </label>
      {state && (
        <p className={state.ok ? "notice notice-good" : "error"} role={state.ok ? "status" : "alert"}>
          {state.message}
        </p>
      )}
      <div className="form-actions">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add code"}
        </button>
      </div>
    </form>
  );
}
