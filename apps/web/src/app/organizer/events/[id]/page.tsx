import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatEventWhen, formatPaise } from "@nikl/utils";
import { requireUser } from "@/lib/auth";
import { DashSkeleton, OrganizerHeader, Pill, eventStatusLabel } from "@/components/organizer-ui";
import { deleteDraftAction, setEventStatusAction, setOccurrenceStatusAction, setPromoActiveAction } from "../../actions";
import { PromoForm } from "./promo-form";
import { EditEventForm } from "./edit-event-form";
import { EventPinForm } from "./event-pin-form";

export const metadata: Metadata = { title: "Manage event" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; error?: string }> };

export default function ManageEventPage({ params, searchParams }: Props) {
  return (
    <>
      <OrganizerHeader />
      <main className="wrap dash narrow-page">
        <Link href="/organizer" className="back-link">
          ← Dashboard
        </Link>
        <Suspense fallback={<DashSkeleton />}>
          <ManageEvent params={params} searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

const isPast = (iso: string) => new Date(iso).getTime() < Date.now();

async function ManageEvent({ params, searchParams }: Props) {
  const [{ id }, { created, error }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, user } = await requireUser(`/organizer/events/${id}`);

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, title, slug, status, category, description, poster_url, recurrence_rule, club_id, clubs(name, review_status), venues(name, area, address, lat, lng), event_occurrences(id, starts_at, ends_at, status, capacity, seats_taken, ticket_tiers(id, name, price_paise, quantity, sold, position))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!event) notFound();

  // Promo codes are visible only to the club's owners and admins (row rules), so an empty list also
  // means "not allowed": check the role to decide whether to show the panel.
  const [{ data: membership }, { data: promos }] = await Promise.all([
    supabase.from("club_members").select("role").eq("club_id", event.club_id).eq("user_id", user.id).eq("status", "active").maybeSingle(),
    supabase
      .from("promo_codes")
      .select("id, code, percent_off, amount_off_paise, max_uses, used, valid_until, active, event_id")
      .eq("club_id", event.club_id)
      .or(`event_id.is.null,event_id.eq.${event.id}`)
      .order("created_at", { ascending: false }),
  ]);
  const canEdit = membership?.role === "owner" || membership?.role === "admin";

  const clubLive = event.clubs?.review_status === "approved";
  const status = eventStatusLabel(event.status, clubLive);
  const dates = [...event.event_occurrences].sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  const statusButton = (value: "published" | "draft" | "cancelled", label: string, kind = "btn") => (
    <form action={setEventStatusAction}>
      <input type="hidden" name="eventId" value={event.id} />
      <input type="hidden" name="status" value={value} />
      <button className={kind} type="submit">
        {label}
      </button>
    </form>
  );

  return (
    <div className="stack">
      {error && (
        <p className="notice notice-bad" role="alert">
          {error.slice(0, 200)}
        </p>
      )}
      {created && (
        <p className="notice notice-good" role="status">
          {event.status === "published"
            ? clubLive
              ? "Your event is live."
              : "Event published. It goes live as soon as your club page is approved."
            : "Draft saved. Publish it when you're ready."}
        </p>
      )}

      <section className="panel">
        <div className="club-title">
          <div>
            <h1>{event.title}</h1>
            <p className="muted">
              {event.clubs?.name}
              {event.venues?.name ? ` · ${event.venues.name}` : ""}
              {event.venues?.area ? `, ${event.venues.area}` : ""}
            </p>
          </div>
          <Pill tone={status.tone}>{status.label}</Pill>
        </div>
        <div className="actions-row">
          {event.status === "draft" && statusButton("published", "Publish", "btn primary")}
          {event.status === "published" && statusButton("draft", "Move back to draft")}
          {event.status !== "cancelled" && event.status !== "draft" && statusButton("cancelled", "Cancel event", "btn danger")}
          {event.status === "cancelled" && statusButton("published", "Restore event")}
          {event.status === "draft" && (
            <form action={deleteDraftAction}>
              <input type="hidden" name="eventId" value={event.id} />
              <button className="btn danger" type="submit">
                Delete draft
              </button>
            </form>
          )}
        </div>
        <p className="hint">
          {event.status === "draft" || !clubLive ? (
            <>
              Public page once it&apos;s live: <span className="mono">/e/{event.slug}</span>.
            </>
          ) : (
            <>
              Public page:{" "}
              <Link href={`/e/${event.slug}`} className="link">
                /e/{event.slug}
              </Link>
              .
            </>
          )}{" "}
          Cancelling notifies and refunds ticket holders once bookings are live.
        </p>
      </section>

      <section className="panel">
        <h2>Details</h2>
        <EditEventForm
          userId={user.id}
          event={{
            id: event.id,
            title: event.title,
            category: event.category,
            description: event.description ?? "",
            posterUrl: event.poster_url,
          }}
        />
      </section>

      {event.venues?.name && (
        <section className="panel">
          <h2>Map pin</h2>
          <p className="hint" style={{ margin: 0 }}>
            Events with a pin show on the Explore map. Tap where {event.venues.name} is; drag to adjust.
          </p>
          <EventPinForm
            eventId={event.id}
            area={event.venues.area ?? ""}
            initial={event.venues.lat != null && event.venues.lng != null ? { lat: event.venues.lat, lng: event.venues.lng } : null}
          />
        </section>
      )}

      <section className="panel">
        <h2>
          Dates <span className="muted small">({dates.length})</span>
        </h2>
        <ul className="date-list">
          {dates.map((o) => {
            const past = isPast(o.starts_at);
            const tiers = [...o.ticket_tiers].sort((a, b) => a.position - b.position);
            return (
              <li key={o.id} className={o.status === "cancelled" ? "is-cancelled" : ""}>
                <div className="date-main">
                  <strong>{formatEventWhen(o.starts_at)}</strong>
                  <span className="muted small">
                    {o.seats_taken} going{o.capacity ? ` of ${o.capacity}` : ""} ·{" "}
                    {tiers.map((t) => `${t.name} ${formatPaise(t.price_paise)}${t.quantity ? ` (${t.sold}/${t.quantity})` : ""}`).join(" · ")}
                  </span>
                </div>
                {o.status === "cancelled" ? (
                  <span className="date-side">
                    <Pill tone="bad">Cancelled</Pill>
                    {!past && (
                      <form action={setOccurrenceStatusAction}>
                        <input type="hidden" name="occurrenceId" value={o.id} />
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="status" value="scheduled" />
                        <button className="link" type="submit">
                          Restore
                        </button>
                      </form>
                    )}
                  </span>
                ) : past ? (
                  <Pill tone="muted">Past</Pill>
                ) : (
                  <form action={setOccurrenceStatusAction}>
                    <input type="hidden" name="occurrenceId" value={o.id} />
                        <input type="hidden" name="eventId" value={event.id} />
                    <input type="hidden" name="status" value="cancelled" />
                    <button className="link danger-link" type="submit">
                      Cancel this date
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
        <p className="hint">Changing the time or prices of a date that already has bookings comes later; for now, cancel the date and add a new event.</p>
      </section>

      {canEdit && (
        <section className="panel">
          <h2>Promo codes</h2>
          {(promos ?? []).length > 0 && (
            <ul className="date-list">
              {(promos ?? []).map((p) => (
                <li key={p.id}>
                  <div className="date-main">
                    <strong className="mono">{p.code}</strong>
                    <span className="muted small">
                      {p.percent_off ? `${p.percent_off}% off` : `${formatPaise(p.amount_off_paise ?? 0)} off`}
                      {p.event_id ? " · this event" : " · all events"} · used {p.used}
                      {p.max_uses ? ` of ${p.max_uses}` : ""}
                      {p.valid_until ? ` · until ${formatEventWhen(p.valid_until).split(" · ")[0]}` : ""}
                    </span>
                  </div>
                  <form action={setPromoActiveAction} className="date-side">
                    <input type="hidden" name="promoId" value={p.id} />
                    <input type="hidden" name="eventId" value={event.id} />
                    <input type="hidden" name="active" value={p.active ? "false" : "true"} />
                    {!p.active && <Pill tone="muted">Off</Pill>}
                    <button className="link" type="submit">
                      {p.active ? "Switch off" : "Switch on"}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <PromoForm clubId={event.club_id} eventId={event.id} />
        </section>
      )}
    </div>
  );
}
