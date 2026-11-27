/**
 * Booking helpers shared by the app and the website. The database checks everything again;
 * these only decide what the screens show and allow.
 */

/** Most tickets in one booking, and of one ticket type (the database enforces the same). */
export const MAX_TICKETS_PER_BOOKING = 10;
export const MAX_PER_TIER = 10;

export type TierWindow = {
  quantity: number | null;
  sold: number;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
};

export type TierAvailability =
  | { state: 'on_sale'; max: number; left: number | null }
  | { state: 'sold_out' | 'not_yet' | 'ended'; max: 0; left: number | null };

/** Whether a ticket type can be picked right now, and how many of it at most. */
export function tierAvailability(tier: TierWindow, now: Date = new Date()): TierAvailability {
  const left = tier.quantity === null ? null : Math.max(tier.quantity - tier.sold, 0);
  if (tier.sale_starts_at && new Date(tier.sale_starts_at).getTime() > now.getTime()) return { state: 'not_yet', max: 0, left };
  if (tier.sale_ends_at && new Date(tier.sale_ends_at).getTime() <= now.getTime()) return { state: 'ended', max: 0, left };
  if (left === 0) return { state: 'sold_out', max: 0, left };
  return { state: 'on_sale', max: Math.min(left ?? MAX_PER_TIER, MAX_PER_TIER), left };
}

/**
 * The new quantity after tapping − or + on one ticket type, keeping within the type's limit and
 * the booking's 10-ticket limit. `others` is how many tickets of other types are picked.
 */
export function stepQuantity(current: number, delta: 1 | -1, max: number, others: number): number {
  const cap = Math.max(Math.min(max, MAX_TICKETS_PER_BOOKING - others), 0);
  return Math.min(Math.max(current + delta, 0), Math.max(cap, Math.min(current, cap)));
}

/** "9:05" left until a hold expires (never negative). */
export function formatCountdown(expiresAt: string | Date, now: Date = new Date()): string {
  const secs = Math.max(Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 1000), 0);
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

export type BookingSection = 'in_progress' | 'upcoming' | 'past' | 'other';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/**
 * Where a booking from my_bookings belongs on the Tickets tab. Unpaid holds that can still be
 * paid are "in progress"; bookings with tickets are upcoming or past; the rest (refund pending,
 * cancel requested, refunded) are "other".
 */
export function bookingSection(
  b: { status: string; pay_token: string | null; ticket_count: number; starts_at: string; ends_at: string | null },
  now: Date = new Date(),
): BookingSection {
  if (['held', 'payment_pending', 'failed'].includes(b.status)) return b.pay_token ? 'in_progress' : 'other';
  const hasTickets = ['confirmed', 'checked_in'].includes(b.status) || (['late_paid', 'paid'].includes(b.status) && b.ticket_count > 0);
  if (!hasTickets) return 'other';
  const end = b.ends_at ? new Date(b.ends_at).getTime() : new Date(b.starts_at).getTime() + TWO_HOURS_MS;
  return end > now.getTime() ? 'upcoming' : 'past';
}
