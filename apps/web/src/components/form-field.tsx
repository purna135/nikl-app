import type { ReactNode } from "react";

/** Label + control + hint/error, with the error wired to the control for screen readers. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
  optional,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>
        {label}
        {optional && <span className="muted"> (optional)</span>}
      </label>
      {children}
      {error ? (
        <p className="error" id={`${id}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** aria props for a control inside <Field>. */
export function describedBy(id: string, error?: string, hint?: string) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}
