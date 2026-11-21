"use client";

import { useActionState, useMemo, useState } from "react";
import { BBSR_AREAS, CATEGORIES } from "@nikl/utils";
import { Field, describedBy } from "@/components/form-field";
import { PosterPicker, type PosterValue } from "@/components/poster-picker";
import { PinPicker, type Pin } from "@/components/pin-picker";
import { getSupabase } from "@/lib/supabase/client";
import type { ActionResult } from "@/lib/errors";
import { createEventAction } from "../../actions";

type Club = { id: string; name: string; review_status: "pending" | "approved" | "rejected" | "suspended" };
type Tier = { name: string; price: string; quantity: string };

/** What the poster-reading function returns (supabase/functions/extract-event). */
type PosterFields = {
  title?: string;
  category?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  venueName?: string;
  venueArea?: string;
  pricePaise?: number;
  description?: string;
};

// Poster reading is on hold (DECISIONS.md T23). Flip this env flag to bring the button back.
const POSTER_AI_ENABLED = process.env.NEXT_PUBLIC_POSTER_AI_ENABLED === "true";

const todayIST = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const addDay = (d: string) => {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
};

export function EventForm({ clubs, defaultClubId, userId }: { clubs: Club[]; defaultClubId: string; userId: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createEventAction, null);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  const [clubId, setClubId] = useState(defaultClubId);
  const [poster, setPoster] = useState<PosterValue>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [venueArea, setVenueArea] = useState("");
  const [pin, setPin] = useState<Pin>(null);
  const [description, setDescription] = useState("");
  const [paid, setPaid] = useState(false);
  const [tiers, setTiers] = useState<Tier[]>([{ name: "Regular", price: "", quantity: "" }]);
  const [capacity, setCapacity] = useState("");
  const [repeat, setRepeat] = useState(false);
  const [repeatWeeks, setRepeatWeeks] = useState("4");
  const [minDate] = useState(todayIST);

  const [reading, setReading] = useState(false);
  const [aiNote, setAiNote] = useState<{ tone: "good" | "warn"; text: string } | null>(null);
  const [aiFilled, setAiFilled] = useState<Set<string>>(new Set());
  const club = clubs.find((c) => c.id === clubId);

  const startsAt = date && startTime ? `${date}T${startTime}:00+05:30` : "";
  const endsAt = date && startTime && endTime ? `${endTime <= startTime ? addDay(date) : date}T${endTime}:00+05:30` : "";
  const tiersJson = useMemo(
    () =>
      JSON.stringify(
        paid
          ? tiers
              .filter((t) => t.name.trim() || t.price.trim())
              .map((t) => ({
                name: t.name.trim(),
                pricePaise: Math.round(Number.parseFloat(t.price || "0") * 100),
                ...(t.quantity.trim() ? { quantity: Number.parseInt(t.quantity, 10) } : {}),
              }))
          : [],
      ),
    [paid, tiers],
  );

  const filled = (key: string) => (aiFilled.has(key) ? " ai-filled" : "");
  const touch = (key: string) =>
    setAiFilled((s) => {
      if (!s.has(key)) return s;
      const n = new Set(s);
      n.delete(key);
      return n;
    });

  async function readPoster() {
    if (!poster) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setReading(true);
    setAiNote(null);
    const { data, error } = await supabase.functions.invoke<{ fields?: PosterFields; source?: string; error?: string; message?: string }>(
      "extract-event",
      { body: { posterPath: poster.path } },
    );
    setReading(false);
    if (error || !data) {
      setAiNote({ tone: "warn", text: "Couldn't read the poster right now. Fill in the details below." });
      return;
    }
    if (data.error || !data.fields) {
      setAiNote({ tone: "warn", text: data.message ?? "Couldn't read the poster. Fill in the details below." });
      return;
    }
    const f = data.fields;
    const got = new Set<string>();
    const apply = (key: string, value: string | undefined, valid: boolean, set: (v: string) => void) => {
      if (value && valid) {
        set(value);
        got.add(key);
      }
    };
    apply("title", f.title, true, setTitle);
    apply("category", f.category, CATEGORIES.some((c) => c.id === f.category), setCategory);
    apply("date", f.date, Boolean(f.date && f.date >= minDate), setDate);
    apply("startTime", f.startTime, /^\d{2}:\d{2}$/.test(f.startTime ?? ""), setStartTime);
    apply("endTime", f.endTime, /^\d{2}:\d{2}$/.test(f.endTime ?? ""), setEndTime);
    apply("venueName", f.venueName, true, setVenueName);
    apply("venueArea", f.venueArea, (BBSR_AREAS as readonly string[]).includes(f.venueArea ?? ""), setVenueArea);
    apply("description", f.description, true, setDescription);
    if (typeof f.pricePaise === "number") {
      if (f.pricePaise > 0) {
        setPaid(true);
        setTiers([{ name: "Regular", price: String(f.pricePaise / 100), quantity: "" }]);
      } else setPaid(false);
      got.add("tickets");
    }
    setAiFilled(got);
    setAiNote(
      got.size > 0
        ? { tone: "good", text: `Filled ${got.size} field${got.size > 1 ? "s" : ""} from your poster${data.source === "sample" ? " (sample data: poster reading isn't switched on yet)" : ""}. Check them before publishing.` }
        : { tone: "warn", text: "We couldn't find event details on that poster. Fill them in below." },
    );
  }

  const setTier = (i: number, patch: Partial<Tier>) => setTiers((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  // Empty rows aren't sent, so the server's tier index can differ from the row on screen.
  const sentRows = tiers.map((t, i) => (t.name.trim() || t.price.trim() ? i : -1)).filter((i) => i >= 0);
  const tierError = (i: number, field: "pricePaise" | "name") => {
    const k = sentRows.indexOf(i);
    return k >= 0 ? errors[`tiers.${k}.${field}`] : undefined;
  };

  return (
    <form action={action} className="form" noValidate>
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="posterUrl" value={poster?.url ?? ""} />
      <input type="hidden" name="startsAt" value={startsAt} />
      <input type="hidden" name="endsAt" value={endsAt} />
      <input type="hidden" name="tiers" value={tiersJson} />
      <input type="hidden" name="repeatWeeks" value={repeat ? repeatWeeks : "1"} />
      <input type="hidden" name="venueLat" value={pin?.lat ?? ""} />
      <input type="hidden" name="venueLng" value={pin?.lng ?? ""} />

      {clubs.length > 1 && (
        <Field id="club" label="Club">
          <select id="club" className="input" value={clubId} onChange={(e) => setClubId(e.target.value)}>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <section className="form-section">
        <h2>Poster</h2>
        <PosterPicker
          userId={userId}
          value={poster}
          onChange={(v) => {
            setPoster(v);
            setAiNote(null);
          }}
        />
        {POSTER_AI_ENABLED && poster && (
          <div className="ai-row">
            <button type="button" className="btn dark" onClick={readPoster} disabled={reading}>
              {reading ? "Reading your poster…" : "✨ Fill in details from poster"}
            </button>
            <span className="hint">We read the date, time, venue and price. You check before publishing.</span>
          </div>
        )}
        {aiNote && (
          <p className={`notice notice-${aiNote.tone}`} role="status">
            {aiNote.text}
          </p>
        )}
      </section>

      <section className="form-section">
        <h2>Details</h2>
        <Field id="title" label="Event name" error={errors.title}>
          <input
            id="title"
            name="title"
            className={`input${filled("title")}`}
            maxLength={120}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              touch("title");
            }}
            placeholder="Sunday Long Run"
            {...describedBy("title", errors.title)}
          />
        </Field>
        <Field id="category" label="Category" error={errors.category}>
          <select
            id="category"
            name="category"
            className={`input${filled("category")}`}
            value={category}
            onChange={(e) => (setCategory(e.target.value), touch("category"))}
            {...describedBy("category", errors.category)}
          >
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
        <Field id="description" label="Description" optional error={errors.description}>
          <textarea
            id="description"
            name="description"
            className={`input textarea${filled("description")}`}
            rows={4}
            maxLength={5000}
            value={description}
            onChange={(e) => (setDescription(e.target.value), touch("description"))}
            placeholder="What happens, who it's for, what to bring."
          />
        </Field>
      </section>

      <section className="form-section">
        <h2>When</h2>
        <div className="three">
          <Field id="date" label="Date" error={errors.startsAt}>
            <input
              id="date"
              type="date"
              className={`input${filled("date")}`}
              min={minDate}
              value={date}
              onChange={(e) => (setDate(e.target.value), touch("date"))}
              {...describedBy("date", errors.startsAt)}
            />
          </Field>
          <Field id="startTime" label="Starts">
            <input id="startTime" type="time" className={`input${filled("startTime")}`} value={startTime} onChange={(e) => (setStartTime(e.target.value), touch("startTime"))} />
          </Field>
          <Field id="endTime" label="Ends" optional error={errors.endsAt}>
            <input id="endTime" type="time" className={`input${filled("endTime")}`} value={endTime} onChange={(e) => (setEndTime(e.target.value), touch("endTime"))} />
          </Field>
        </div>
        <p className="hint">Times are India time (IST). An end time before the start means it ends after midnight.</p>
        <label className="check">
          <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
          Repeats every week
        </label>
        {repeat && (
          <Field id="repeatWeeks" label="How many weeks?" hint="Each week becomes its own date with its own tickets. You can cancel single dates later.">
            <select id="repeatWeeks" className="input narrow" value={repeatWeeks} onChange={(e) => setRepeatWeeks(e.target.value)}>
              {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
                <option key={n} value={n}>
                  {n} weeks
                </option>
              ))}
            </select>
          </Field>
        )}
      </section>

      <section className="form-section">
        <h2>Where</h2>
        <Field id="venueName" label="Venue" error={errors.venueName}>
          <input
            id="venueName"
            name="venueName"
            className={`input${filled("venueName")}`}
            maxLength={120}
            value={venueName}
            onChange={(e) => (setVenueName(e.target.value), touch("venueName"))}
            placeholder="Infocity Square"
            {...describedBy("venueName", errors.venueName)}
          />
        </Field>
        <div className="two">
          <Field id="venueAddress" label="Address or landmark" optional>
            <input id="venueAddress" name="venueAddress" className="input" maxLength={200} value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} />
          </Field>
          <Field id="venueArea" label="Area" optional>
            <select id="venueArea" name="venueArea" className={`input${filled("venueArea")}`} value={venueArea} onChange={(e) => (setVenueArea(e.target.value), touch("venueArea"))}>
              <option value="">Choose area</option>
              {BBSR_AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <PinPicker value={pin} onChange={setPin} area={venueArea} />
        {errors.venueLat && <p className="error">{errors.venueLat}</p>}
        {errors.venueLng && <p className="error">{errors.venueLng}</p>}
      </section>

      <section className={`form-section${filled("tickets")}`}>
        <h2>Tickets</h2>
        <div className="seg" role="radiogroup" aria-label="Ticket type">
          <button type="button" role="radio" aria-checked={!paid} className={!paid ? "on" : ""} onClick={() => setPaid(false)}>
            Free RSVP
          </button>
          <button type="button" role="radio" aria-checked={paid} className={paid ? "on" : ""} onClick={() => setPaid(true)}>
            Paid tickets
          </button>
        </div>
        {paid && (
          <div className="tiers">
            {tiers.map((t, i) => (
              <div key={i} className="tier-row">
                <input className="input" aria-label={`Ticket ${i + 1} name`} placeholder="Regular" value={t.name} maxLength={40} onChange={(e) => setTier(i, { name: e.target.value })} />
                <div className="input-prefix">
                  <span aria-hidden="true">₹</span>
                  <input className="input" aria-label={`Ticket ${i + 1} price in rupees`} inputMode="decimal" placeholder="199" value={t.price} onChange={(e) => setTier(i, { price: e.target.value.replace(/[^\d.]/g, "") })} />
                </div>
                <input className="input" aria-label={`Ticket ${i + 1} quantity`} inputMode="numeric" placeholder="Qty (optional)" value={t.quantity} onChange={(e) => setTier(i, { quantity: e.target.value.replace(/\D/g, "") })} />
                {tiers.length > 1 && (
                  <button type="button" className="link" onClick={() => setTiers((ts) => ts.filter((_, j) => j !== i))} aria-label={`Remove ticket ${i + 1}`}>
                    Remove
                  </button>
                )}
                {tierError(i, "pricePaise") && <p className="error tier-error">{tierError(i, "pricePaise")}</p>}
                {tierError(i, "name") && <p className="error tier-error">{tierError(i, "name")}</p>}
              </div>
            ))}
            {tiers.length < 6 && (
              <button type="button" className="link" onClick={() => setTiers((ts) => [...ts, { name: "", price: "", quantity: "" }])}>
                + Add ticket type (e.g. Early bird)
              </button>
            )}
            <p className="hint">Attendees pay a 4% booking fee on top. You receive the full ticket price.</p>
          </div>
        )}
        <Field id="capacity" label="Total spots" optional hint="Leave empty for no limit." error={errors.capacity}>
          <input id="capacity" name="capacity" className="input narrow" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ""))} />
        </Field>
      </section>

      {state && !state.ok && (
        <p className="error" role="alert">
          {state.message}
        </p>
      )}
      {club && club.review_status !== "approved" && (
        <p className="notice notice-warn">Your club page is waiting for approval. Published events go live as soon as it&apos;s approved.</p>
      )}
      <div className="form-actions">
        <button className="btn" type="submit" name="intent" value="draft" disabled={pending}>
          Save as draft
        </button>
        <button className="btn primary" type="submit" name="intent" value="publish" disabled={pending}>
          {pending ? "Saving…" : "Publish event"}
        </button>
      </div>
    </form>
  );
}
