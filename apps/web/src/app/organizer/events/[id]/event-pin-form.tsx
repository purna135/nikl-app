"use client";

import { useActionState, useState } from "react";
import { PinPicker, type Pin } from "@/components/pin-picker";
import type { ActionResult } from "@/lib/errors";
import { setEventPinAction } from "../../actions";

/** Add, move or remove the venue pin of an existing event. */
export function EventPinForm({ eventId, area, initial }: { eventId: string; area: string; initial: Pin }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(setEventPinAction, null);
  const [pin, setPin] = useState<Pin>(initial);
  const changed = pin?.lat !== initial?.lat || pin?.lng !== initial?.lng;

  return (
    <form action={action} className="form">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="venueLat" value={pin?.lat ?? ""} />
      <input type="hidden" name="venueLng" value={pin?.lng ?? ""} />
      <PinPicker value={pin} onChange={setPin} area={area} />
      {state && (
        <p className={state.ok ? "notice notice-good" : "error"} role={state.ok ? "status" : "alert"}>
          {state.message}
        </p>
      )}
      <div className="form-actions">
        <button className="btn primary" type="submit" disabled={pending || !changed}>
          {pending ? "Saving…" : "Save pin"}
        </button>
      </div>
    </form>
  );
}
