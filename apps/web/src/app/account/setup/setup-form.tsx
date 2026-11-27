"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BBSR_AREAS, CATEGORIES } from "@nikl/utils";
import { profileSetupSchema } from "@nikl/validation";
import { getSupabase } from "@/lib/supabase/client";

type Initial = { name: string; username: string; area: string; interests: string[]; dobYear: string };

/** Same fields and rules as the app's profile set-up; the database checks them again (complete_profile). */
export function ProfileSetupForm({ next, initial }: { next: string; initial: Initial }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [username, setUsername] = useState(initial.username);
  const [area, setArea] = useState(initial.area);
  const [interests, setInterests] = useState<string[]>(initial.interests);
  const [dobYear, setDobYear] = useState(initial.dobYear);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) => setInterests((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setProblem(null);
    const parsed = profileSetupSchema.safeParse({ name, username, area, interests, dobYear: Number.parseInt(dobYear, 10) });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    const p = parsed.data;
    const { error } = await supabase.rpc("complete_profile", {
      p_name: p.name,
      p_username: p.username,
      p_area: p.area,
      p_interests: p.interests,
      p_dob_year: p.dobYear,
    });
    setBusy(false);
    if (error) {
      setProblem(error.code === "23505" ? "That username is taken. Try another one." : error.code === "22023" || error.code === "P0001" ? error.message : "That didn't save. Try again.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  const err = (k: string) => (errors[k] ? <p className="error">{errors[k]}</p> : null);

  return (
    <form className="card form" onSubmit={save} noValidate style={{ maxWidth: 440 }}>
      <h1>Set up your profile</h1>
      <p>So clubs know who&apos;s coming. Your birth year stays private; it&apos;s only to check you&apos;re 18 or older.</p>
      <div className="field">
        <label htmlFor="name">Your name</label>
        <input id="name" className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        {err("name")}
      </div>
      <div className="field">
        <label htmlFor="username">Username</label>
        <div className="input-prefix">
          <span aria-hidden="true">@</span>
          <input
            id="username"
            className="input"
            value={username}
            maxLength={30}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            autoCapitalize="none"
            autoComplete="username"
          />
        </div>
        {err("username")}
      </div>
      <div className="two">
        <div className="field">
          <label htmlFor="area">Area</label>
          <select id="area" className="input" value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Choose</option>
            {BBSR_AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          {err("area")}
        </div>
        <div className="field">
          <label htmlFor="dob">Birth year</label>
          <input id="dob" className="input" inputMode="numeric" maxLength={4} value={dobYear} onChange={(e) => setDobYear(e.target.value.replace(/\D/g, ""))} />
          {err("dobYear")}
        </div>
      </div>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>What are you into? (pick 3 or more)</legend>
        <div className="date-chips">
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" className={`chip${interests.includes(c.id) ? " on" : ""}`} aria-pressed={interests.includes(c.id)} onClick={() => toggle(c.id)}>
              {c.emoji} {c.short}
            </button>
          ))}
        </div>
        {err("interests")}
      </fieldset>
      {problem && (
        <p className="error" role="alert">
          {problem}
        </p>
      )}
      <button type="submit" className="btn primary block" disabled={busy}>
        {busy ? "Saving…" : "Save and continue"}
      </button>
    </form>
  );
}
