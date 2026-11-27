import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { formatEventWhen, formatPaise } from "@nikl/utils";
import { requireUser } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { PosterArt } from "@/components/event-card";

export const metadata: Metadata = { title: "Your tickets", robots: { index: false, follow: false } };

export default function TicketsPage({ searchParams }: { searchParams: Promise<{ booked?: string }> }) {
  return (
    <>
      <SiteHeader action="none" />
      <main className="wrap dash narrow-page">
        <h1>Your tickets</h1>
        <Suspense fallback={<div className="skeleton" style={{ height: 240, marginTop: 16 }} />}>
          <Tickets searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

type Row = {
  booking_id: string;
  status: string;
  event_slug: string;
  event_title: string;
  poster_url: string | null;
  category: string;
  club_name: string;
  starts_at: string;
  ends_at: string | null;
  venue_name: string | null;
  area: string | null;
  total_paise: number;
  hold_expires_at: string | null;
  pay_token: string | null;
  items: { name: string; qty: number }[];
  tickets: { code: string; admits: number; status: string }[];
};

/** Splits bookings into in progress / upcoming / past. Runs per request, after the login check. */
function sortOut(rows: Row[]) {
  const now = Date.now();
  const over = (r: Row) => new Date(r.ends_at ?? new Date(r.starts_at).getTime() + 2 * 3_600_000).getTime() <= now;
  return {
    pending: rows.filter((r) => r.pay_token),
    upcoming: rows.filter((r) => !r.pay_token && !over(r)),
    past: rows.filter((r) => !r.pay_token && over(r)).reverse(),
  };
}

const STATUS: Record<string, string> = {
  confirmed: "Confirmed",
  checked_in: "Checked in",
  late_paid: "Paid",
  cancel_requested: "Cancellation requested",
  refunded: "Refunded",
};

async function Tickets({ searchParams }: { searchParams: Promise<{ booked?: string }> }) {
  const [{ booked }, { supabase }] = await Promise.all([searchParams, requireUser("/tickets")]);
  const { data, error } = await supabase.rpc("my_bookings");
  if (error) return <p className="notice notice-bad">We couldn&apos;t load your tickets. Refresh to try again.</p>;
  const { pending, upcoming, past } = sortOut((data ?? []) as unknown as Row[]);

  return (
    <div className="stack" style={{ marginTop: 16 }}>
      {booked && (
        <p className="notice notice-good" role="status">
          You&apos;re going! Your ticket is below.
        </p>
      )}

      {pending.length > 0 && (
        <section className="stack" style={{ gap: 10 }}>
          <h2 style={{ fontSize: 18 }}>Waiting for payment</h2>
          <ul className="ticket-list">
            {pending.map((r) => (
              <li key={r.booking_id} className="ticket">
                <EventLine row={r} />
                <div className="actions-row">
                  <Link href={`/pay/${r.pay_token}`} className="btn primary">
                    Finish paying {formatPaise(r.total_paise, { zeroAsFree: false })}
                  </Link>
                  <span className="muted small">Seats held until {formatEventWhen(r.hold_expires_at!).split(" · ")[1]}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="stack" style={{ gap: 10 }}>
        <h2 style={{ fontSize: 18 }}>Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="empty">
            <p>No upcoming plans yet.</p>
            <Link href="/explore" className="link">
              Find something to do
            </Link>
          </div>
        ) : (
          <ul className="ticket-list">
            {upcoming.map((r) => (
              <li key={r.booking_id} className="ticket">
                <EventLine row={r} />
                {r.tickets.length > 0 ? (
                  <>
                    <div className="ticket-codes" aria-label="Ticket codes">
                      {r.tickets.map((t) => (
                        <span key={t.code} className="ticket-code" title={t.admits > 1 ? `Admits ${t.admits}` : undefined}>
                          {t.code}
                          {t.admits > 1 ? ` ×${t.admits}` : ""}
                        </span>
                      ))}
                    </div>
                    <p className="hint" style={{ margin: 0 }}>
                      Show these codes at the entry. The Nikl app will show a QR code for them soon.
                    </p>
                  </>
                ) : (
                  <p className="notice notice-warn">The event filled up while you paid, so we&apos;re refunding you in full.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="stack" style={{ gap: 10 }}>
          <h2 style={{ fontSize: 18 }}>Past</h2>
          <ul className="ticket-list">
            {past.map((r) => (
              <li key={r.booking_id} className="ticket">
                <EventLine row={r} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function EventLine({ row }: { row: Row }) {
  return (
    <div className="pay-event">
      <PosterArt url={row.poster_url} category={row.category} className="pay-poster" />
      <div>
        <Link href={`/e/${row.event_slug}`} style={{ fontWeight: 700, textDecoration: "none" }}>
          {row.event_title}
        </Link>
        <span className="muted small">
          {formatEventWhen(row.starts_at)}
          {row.venue_name ? ` · ${row.venue_name}` : ""}
        </span>
        <span className="muted small">
          {row.items.map((i) => `${i.qty} × ${i.name}`).join(", ")}
          {STATUS[row.status] ? ` · ${STATUS[row.status]}` : ""}
        </span>
      </div>
    </div>
  );
}
