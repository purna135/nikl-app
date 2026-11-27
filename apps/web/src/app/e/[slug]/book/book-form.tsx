"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatEventDay, formatEventTime, formatPaise } from "@nikl/utils";
import { getSupabase } from "@/lib/supabase/client";

export type BookTier = {
  id: string;
  name: string;
  price_paise: number;
  quantity: number | null;
  sold: number;
  seats_per_ticket: number;
  position: number;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
};
export type BookDate = { id: string; startsAt: string; spotsLeft: number | null; tiers: BookTier[] };

type Quote = { subtotal_paise: number; discount_paise: number; fee_paise: number; total_paise: number };

const MAX_EACH = 10;
const MAX_TOTAL = 10;

/** Ticket picker with a live price (quote_booking) and the hold (hold_booking). The database has the final say. */
export function BookForm({
  event,
  dates,
}: {
  event: { title: string; slug: string; clubName: string | null; ageLimit: number | null; womenOnly: boolean };
  dates: BookDate[];
}) {
  const router = useRouter();
  const [dateId, setDateId] = useState(dates[0]!.id);
  const date = dates.find((d) => d.id === dateId) ?? dates[0]!;
  const [qty, setQty] = useState<Record<string, number>>(() => {
    const first = dates[0]!.tiers[0];
    return first && dates[0]!.tiers.length === 1 ? { [first.id]: 1 } : {};
  });
  const [codeInput, setCodeInput] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  const items = useMemo(
    () => date.tiers.filter((t) => (qty[t.id] ?? 0) > 0).map((t) => ({ tier_id: t.id, qty: qty[t.id]! })),
    [date, qty],
  );
  const totalTickets = items.reduce((n, i) => n + i.qty, 0);

  // Live price, a moment after the last change.
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || items.length === 0) return;
    let active = true;
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc("quote_booking", { p_occurrence_id: date.id, p_items: items, p_promo_code: code ?? undefined });
      if (!active) return;
      if (error) {
        setQuote(null);
        setProblem(error.code === "22023" ? error.message : "Couldn't work out the price. Check your connection.");
        // A code that doesn't fit is dropped so the rest still works.
        if (code && /code/i.test(error.message)) setCode(null);
      } else {
        setProblem(null);
        setQuote((data ?? [])[0] ?? null);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [date.id, items, code]);

  const change = (tier: BookTier, delta: number) =>
    setQty((q) => {
      const current = q[tier.id] ?? 0;
      const next = Math.max(0, Math.min(MAX_EACH, current + delta));
      return { ...q, [tier.id]: next };
    });

  async function submit() {
    const supabase = getSupabase();
    if (!supabase || submitting.current || items.length === 0) return;
    submitting.current = true;
    setBusy(true);
    setProblem(null);
    const { data, error } = await supabase.rpc("hold_booking", {
      p_occurrence_id: date.id,
      p_items: items,
      p_promo_code: code ?? undefined,
      p_idempotency_key: crypto.randomUUID(),
    });
    const booking = (data ?? [])[0];
    if (error || !booking) {
      submitting.current = false;
      setBusy(false);
      if (error?.message?.startsWith("Finish setting up")) {
        router.push(`/account/setup?next=${encodeURIComponent(`/e/${event.slug}/book`)}`);
        return;
      }
      setProblem(error?.code === "22023" ? error.message : "That didn't work. Check your connection and try again.");
      return;
    }
    if (booking.status === "confirmed") router.push("/tickets?booked=1");
    else router.push(`/pay/${booking.pay_token}`);
  }

  const free = quote ? quote.total_paise === 0 : date.tiers.every((t) => t.price_paise === 0);

  return (
    <div className="card book-card">
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 24 }}>{event.title}</h1>
        {event.clubName && <p className="muted small">by {event.clubName}{event.ageLimit ? ` · ${event.ageLimit}+ only` : ""}</p>}
      </div>
      {event.womenOnly && (
        <p className="notice notice-warn" style={{ margin: 0 }}>
          This is a women-only event. The club may check at the entry.
        </p>
      )}

      {dates.length > 1 && (
        <div className="stack" style={{ gap: 8 }}>
          <strong>Date</strong>
          <div className="date-chips" role="radiogroup" aria-label="Date">
            {dates.map((d) => (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={d.id === date.id}
                className={`chip${d.id === date.id ? " on" : ""}`}
                onClick={() => {
                  setDateId(d.id);
                  setQty({});
                }}
              >
                {formatEventDay(d.startsAt)} · {formatEventTime(d.startsAt)}
              </button>
            ))}
          </div>
        </div>
      )}
      {dates.length === 1 && (
        <p style={{ margin: 0 }}>
          <strong>{formatEventDay(date.startsAt)}</strong> <span className="muted">{formatEventTime(date.startsAt)}</span>
        </p>
      )}

      <div>
        {date.tiers.length === 0 && <p className="muted">No tickets on sale for this date right now.</p>}
        {date.tiers.map((t) => {
          const left = t.quantity == null ? null : Math.max(t.quantity - t.sold, 0);
          const n = qty[t.id] ?? 0;
          const soldOut = left === 0 || date.spotsLeft === 0;
          return (
            <div key={t.id} className="tier-pick">
              <div>
                <strong>{t.name}</strong>
                <span className="muted small">
                  {formatPaise(t.price_paise)}
                  {t.seats_per_ticket > 1 ? ` · admits ${t.seats_per_ticket}` : ""}
                  {soldOut ? " · Sold out" : left !== null && left <= 10 ? ` · ${left} left` : ""}
                </span>
              </div>
              <div className="stepper">
                <button type="button" onClick={() => change(t, -1)} disabled={n === 0 || busy} aria-label={`One fewer ${t.name}`}>
                  −
                </button>
                <output aria-live="polite" aria-label={`${n} ${t.name}`}>
                  {n}
                </output>
                <button
                  type="button"
                  onClick={() => change(t, 1)}
                  disabled={busy || soldOut || n >= MAX_EACH || totalTickets >= MAX_TOTAL || (left !== null && n >= left)}
                  aria-label={`One more ${t.name}`}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!free && (
        <form
          className="actions-row"
          onSubmit={(e) => {
            e.preventDefault();
            setCode(codeInput.trim().toUpperCase() || null);
          }}
        >
          <label className="sr-only" htmlFor="promo">
            Promo code
          </label>
          <input
            id="promo"
            className="input"
            style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 12, height: 44 }}
            placeholder="Promo code"
            value={codeInput}
            maxLength={20}
            onChange={(e) => setCodeInput(e.target.value.replace(/[^a-z0-9]/gi, ""))}
          />
          <button type="submit" className="btn" disabled={!codeInput.trim()}>
            Apply
          </button>
          {code && <span className="pill pill-good">{code} applied</span>}
        </form>
      )}

      {quote && items.length > 0 && (
        <ul className="pay-lines" aria-live="polite">
          <li>
            <span>Tickets</span>
            <span>{formatPaise(quote.subtotal_paise)}</span>
          </li>
          {quote.discount_paise > 0 && (
            <li>
              <span>Discount</span>
              <span>− {formatPaise(quote.discount_paise, { zeroAsFree: false })}</span>
            </li>
          )}
          {quote.fee_paise > 0 && (
            <li className="muted">
              <span>Booking fee (4%)</span>
              <span>{formatPaise(quote.fee_paise, { zeroAsFree: false })}</span>
            </li>
          )}
          <li className="pay-total">
            <span>Total</span>
            <span>{formatPaise(quote.total_paise)}</span>
          </li>
        </ul>
      )}

      {problem && (
        <p className="error" role="alert">
          {problem}
        </p>
      )}

      <button type="button" className="btn primary block" disabled={busy || items.length === 0 || !quote} onClick={submit}>
        {busy ? "Holding your seats…" : free ? "RSVP" : quote ? `Continue to pay ${formatPaise(quote.total_paise, { zeroAsFree: false })}` : "Pick your tickets"}
      </button>
      {!free && <p className="hint" style={{ margin: 0, textAlign: "center" }}>We hold your seats for 10 minutes while you pay.</p>}
    </div>
  );
}
