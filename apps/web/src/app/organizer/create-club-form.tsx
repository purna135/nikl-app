"use client";

import { useActionState, useState } from "react";
import { BBSR_AREAS, CATEGORIES } from "@nikl/utils";
import { Field, describedBy } from "@/components/form-field";
import type { ActionResult } from "@/lib/errors";
import { createClubAction } from "./actions";

const toHandle = (name: string) =>
  name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 30);

export function CreateClubForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createClubAction, null);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form action={action} className="form" noValidate>
      <Field id="name" label="Club or organizer name" error={errors.name}>
        <input
          id="name"
          name="name"
          className="input"
          maxLength={80}
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!handleTouched) setHandle(toHandle(e.target.value));
          }}
          placeholder="Patia Pacers"
          {...describedBy("name", errors.name)}
        />
      </Field>

      <Field id="handle" label="Handle" hint="Your page address and @name. Letters, numbers, dots and underscores." error={errors.handle}>
        <div className="input-prefix">
          <span aria-hidden="true">@</span>
          <input
            id="handle"
            name="handle"
            className="input"
            maxLength={30}
            required
            value={handle}
            onChange={(e) => {
              setHandleTouched(true);
              setHandle(e.target.value.toLowerCase());
            }}
            placeholder="patia.pacers"
            {...describedBy("handle", errors.handle, "x")}
          />
        </div>
      </Field>

      <div className="two">
        <Field id="category" label="Category" error={errors.category}>
          <select id="category" name="category" className="input" defaultValue="" required {...describedBy("category", errors.category)}>
            <option value="" disabled>
              Choose one
            </option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field id="area" label="Area" optional error={errors.area}>
          <select id="area" name="area" className="input" defaultValue="">
            <option value="">Anywhere in Bhubaneswar</option>
            {BBSR_AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field id="kind" label="What kind of group?" optional hint='e.g. "Run club", "Pottery studio", "Open mic collective"' error={errors.kind}>
        <input id="kind" name="kind" className="input" maxLength={40} {...describedBy("kind", errors.kind, "x")} />
      </Field>

      <Field id="bio" label="Short bio" optional error={errors.bio}>
        <textarea id="bio" name="bio" className="input textarea" rows={3} maxLength={500} placeholder="What you do, who it's for, how often you meet." />
      </Field>

      {state && !state.ok && (
        <p className="error" role="alert">
          {state.message}
        </p>
      )}
      <button className="btn primary" type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create page and send for review"}
      </button>
    </form>
  );
}
