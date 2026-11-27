"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatEventWhen, formatPaise } from "@nikl/utils";
import { PosterArt } from "@/components/event-card";
import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";

type Booking = {
  booking_id: string;
  status: string;
  event_title: string;
  event_slug: string;
  poster_url: string | null;
  category: string;
  starts_at: string;
  venue_name: string | null;
  area: string | null;
  items: { name: string; qty: number; unit_price_paise: number }[];
  subtotal_paise: number;
  discount_paise: number;
  fee_paise: number;
  total_paise: number;
  hold_expires_at: string | null;
  ticket_count: number;
};

type Start = { mode: "mock" | "razorpay"; orderId: string; keyId?: string; amount: number; currency: string; title: string };

type RazorpayResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: "payment.failed", cb: (r: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const CHECKOUT_JS = "https://checkout.razorpay.com/v1/checkout.js";

function loadCheckout(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = CHECKOUT_JS;
    s.async = true;
    s.onload = () => resolve(Boolean(window.Razorpay));
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const PAID = ["confirmed", "checked_in", "late_paid"];

/** Minutes:seconds left on the hold. */
function useCountdown(until: string | null) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!until) return;
    const tick = () => setLeft(Math.max(0, Math.floor((new Date(until).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until]);
  return left;
}

export function PayView({ token, returnTo }: { token: string; returnTo: string | null }) {
  // null = no such booking (or this copy isn't connected); undefined = still loading.
  const [booking, setBooking] = useState<Booking | null | undefined>(supabaseConfigured ? undefined : null);
  const [mock, setMock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "bad" | "warn" | "good"; text: string } | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data, error } = await supabase.rpc("booking_for_payment", { p_token: token });
    if (error) {
      setMessage({ tone: "bad", text: "We couldn't load this booking. Check your connection and refresh." });
      return;
    }
    setBooking(((data ?? [])[0] as Booking | undefined) ?? null);
  }, [token]);

  // First load (later reloads call `load` after payments).
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let active = true;
    supabase.rpc("booking_for_payment", { p_token: token }).then(({ data, error }) => {
      if (!active) return;
      if (error) setMessage({ tone: "bad", text: "We couldn't load this booking. Check your connection and refresh." });
      else setBooking(((data ?? [])[0] as Booking | undefined) ?? null);
    });
    return () => {
      active = false;
    };
  }, [token]);

  const left = useCountdown(booking && !PAID.includes(booking.status) ? booking.hold_expires_at : null);
  const expired = booking ? booking.status === "expired" || (left !== null && left <= 0 && !PAID.includes(booking.status)) : false;

  async function call(body: Record<string, unknown>) {
    const supabase = getSupabase();
    if (!supabase) throw new Error("not configured");
    const { data, error } = await supabase.functions.invoke<{ status?: string; error?: string; message?: string } & Partial<Start>>("payments", {
      body: { token, ...body },
    });
    if (error) throw error;
    return data ?? {};
  }

  async function pay() {
    if (!booking) return;
    setBusy(true);
    setMessage(null);
    // Stays true only while Razorpay's window is open (its handler or ondismiss clears it).
    let windowOpen = false;
    try {
      const started = await call({ action: "start" });
      if (started.error) {
        setMessage({ tone: "bad", text: started.message ?? "We couldn't start the payment." });
        return;
      }
      if (started.status === "confirmed") return void (await load());
      if (started.mode === "mock") {
        setMock(true);
        return;
      }
      if (!(await loadCheckout()) || !window.Razorpay) {
        setMessage({ tone: "bad", text: "The payment window didn't load. Check your connection and try again." });
        return;
      }
      const rzp = new window.Razorpay({
        key: started.keyId,
        amount: started.amount,
        currency: started.currency ?? "INR",
        order_id: started.orderId,
        name: "Nikl",
        description: booking.event_title.slice(0, 60),
        theme: { color: "#D81B60" },
        notes: { booking_id: booking.booking_id },
        handler: async (r: RazorpayResponse) => {
          setBusy(true);
          try {
            const result = await call({ action: "verify", ...r });
            if (result.error) setMessage({ tone: "bad", text: result.message ?? "We couldn't confirm that payment yet." });
          } catch {
            setMessage({ tone: "warn", text: "Payment done. We're confirming it; refresh in a moment." });
          } finally {
            await load();
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.on("payment.failed", (r) => {
        setMessage({ tone: "bad", text: r.error?.description ? `Payment failed: ${r.error.description}` : "Payment failed. You can try again." });
      });
      rzp.open();
      windowOpen = true;
    } catch {
      setMessage({ tone: "bad", text: "Something went wrong. Check your connection and try again." });
    } finally {
      if (!windowOpen) setBusy(false);
    }
  }

  async function pretend(outcome: "success" | "failure") {
    setBusy(true);
    try {
      const result = await call({ action: "mock_pay", outcome });
      if (result.error) setMessage({ tone: "bad", text: result.message ?? "That didn't work." });
      else if (outcome === "failure") setMessage({ tone: "bad", text: "Payment failed (pretend). You can try again." });
      await load();
    } catch {
      setMessage({ tone: "bad", text: "Something went wrong. Try again." });
    } finally {
      setBusy(false);
    }
  }

  if (booking === undefined) return <div className="skeleton" style={{ height: 320, borderRadius: 18 }} aria-busy="true" />;
  if (booking === null) {
    return (
      <div className="card pay-card">
        <h1>This link doesn&apos;t work</h1>
        <p>The booking may have been replaced or cancelled. Pick your tickets again from the event page.</p>
        <Link href="/explore" className="btn primary block">
          Explore events
        </Link>
      </div>
    );
  }

  const paid = PAID.includes(booking.status);
  return (
    <div className="card pay-card">
      <div className="pay-event">
        <PosterArt url={booking.poster_url} category={booking.category} className="pay-poster" />
        <div>
          <strong>{booking.event_title}</strong>
          <span className="muted small">
            {formatEventWhen(booking.starts_at)}
            {booking.venue_name ? ` · ${booking.venue_name}` : ""}
          </span>
        </div>
      </div>

      <ul className="pay-lines">
        {booking.items.map((i) => (
          <li key={i.name}>
            <span>
              {i.qty} × {i.name}
            </span>
            <span>{formatPaise(i.qty * i.unit_price_paise, { zeroAsFree: false })}</span>
          </li>
        ))}
        {booking.discount_paise > 0 && (
          <li>
            <span>Discount</span>
            <span>− {formatPaise(booking.discount_paise, { zeroAsFree: false })}</span>
          </li>
        )}
        <li className="muted">
          <span>Booking fee</span>
          <span>{formatPaise(booking.fee_paise, { zeroAsFree: false })}</span>
        </li>
        <li className="pay-total">
          <span>Total</span>
          <span>{formatPaise(booking.total_paise, { zeroAsFree: false })}</span>
        </li>
      </ul>

      {paid ? (
        <div className="stack" style={{ gap: 10 }}>
          <p className="notice notice-good" role="status">
            {booking.ticket_count > 0
              ? `You're going! ${booking.ticket_count} ticket${booking.ticket_count > 1 ? "s are" : " is"} in Nikl under Tickets.`
              : "Payment received. The event filled up while you were paying, so we're refunding you in full."}
          </p>
          {returnTo ? (
            <a href={returnTo} className="btn primary block">
              Back to Nikl
            </a>
          ) : (
            <Link href="/tickets" className="btn primary block">
              See your tickets
            </Link>
          )}
        </div>
      ) : expired ? (
        <div className="stack" style={{ gap: 10 }}>
          <p className="notice notice-warn">Your 10 minutes ran out and the seats went back. Pick your tickets again.</p>
          <Link href={`/e/${booking.event_slug}`} className="btn primary block">
            Back to the event
          </Link>
        </div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          {left !== null && (
            <p className="muted small" aria-live="polite" style={{ margin: 0, textAlign: "center" }}>
              Seats held for {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
            </p>
          )}
          {mock ? (
            <div className="mock-box">
              <p className="small" style={{ margin: 0 }}>
                <strong>Test mode:</strong> no money moves. Choose what happens:
              </p>
              <div className="actions-row">
                <button type="button" className="btn primary" disabled={busy} onClick={() => pretend("success")}>
                  Pretend it worked
                </button>
                <button type="button" className="btn" disabled={busy} onClick={() => pretend("failure")}>
                  Pretend it failed
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn primary block" disabled={busy} onClick={pay}>
              {busy ? "Opening payment…" : `Pay ${formatPaise(booking.total_paise, { zeroAsFree: false })}`}
            </button>
          )}
          <p className="hint" style={{ margin: 0, textAlign: "center" }}>
            UPI (GPay, PhonePe, Paytm), cards and netbanking via Razorpay. Nikl never sees your card or UPI PIN.
          </p>
        </div>
      )}
      {message && (
        <p className={`notice notice-${message.tone}`} role="alert">
          {message.text}
        </p>
      )}
    </div>
  );
}
