import { useCallback, useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { Database } from '@nikl/supabase';
import type { Nullable } from './explore';
import { supabase } from './supabase';

type BookingRow = Database['public']['Functions']['my_bookings']['Returns'][number];

export type BookingItem = { name: string; qty: number };
export type Ticket = { code: string; admits: number; status: string };

/** One of my bookings. The type generator calls every column non-null; these can be empty. */
export type MyBooking = Omit<
  Nullable<BookingRow, 'poster_url' | 'ends_at' | 'venue_name' | 'area' | 'hold_expires_at' | 'pay_token'>,
  'items' | 'tickets'
> & { items: BookingItem[]; tickets: Ticket[] };

export type Selection = { tier_id: string; qty: number }[];
export type Quote = { subtotal_paise: number; discount_paise: number; fee_paise: number; total_paise: number };
export type Hold = Quote & { booking_id: string; status: string; hold_expires_at: string | null; pay_token: string | null };

const NETWORK = 'Couldn’t reach Nikl. Check your internet connection and try again.';

/**
 * The database explains booking problems in plain words (code 22023, e.g. "Only 2 Regular left.");
 * show those as they are, and a general message for anything else.
 */
export function bookingMessage(error: { code?: string; message?: string } | null | undefined, fallback = NETWORK): string {
  if (error?.code === '22023' && error.message) return error.message;
  if (error?.code === '42501') return 'Log in to book.';
  return fallback;
}

/** Signals a failed call; the message is safe to show. */
export class BookingError extends Error {}

/** My bookings, soonest event first. Throws when it can't load (for useFocusData). */
export async function fetchMyBookings(): Promise<MyBooking[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('my_bookings');
  if (error) throw new BookingError(bookingMessage(error));
  return (data ?? []).map((row) => ({
    ...row,
    items: Array.isArray(row.items) ? (row.items as BookingItem[]) : [],
    tickets: Array.isArray(row.tickets) ? (row.tickets as Ticket[]) : [],
  })) as MyBooking[];
}

export async function quoteBooking(occurrenceId: string, items: Selection, promo: string | null): Promise<Quote> {
  if (!supabase) throw new BookingError(NETWORK);
  const { data, error } = await supabase.rpc('quote_booking', {
    p_occurrence_id: occurrenceId,
    p_items: items,
    ...(promo ? { p_promo_code: promo } : {}),
  });
  if (error || !data?.[0]) throw new BookingError(bookingMessage(error));
  return data[0];
}

export async function holdBooking(occurrenceId: string, items: Selection, promo: string | null, idempotencyKey: string): Promise<Hold> {
  if (!supabase) throw new BookingError(NETWORK);
  const { data, error } = await supabase.rpc('hold_booking', {
    p_occurrence_id: occurrenceId,
    p_items: items,
    p_idempotency_key: idempotencyKey,
    ...(promo ? { p_promo_code: promo } : {}),
  });
  if (error || !data?.[0]) throw new BookingError(bookingMessage(error));
  return data[0] as Hold;
}

/** Gives the held seats back. */
export async function cancelHold(bookingId: string): Promise<void> {
  if (!supabase) throw new BookingError(NETWORK);
  const { error } = await supabase.rpc('cancel_hold', { p_booking_id: bookingId });
  if (error) throw new BookingError(bookingMessage(error, 'Couldn’t cancel. Try again.'));
}

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL;

/** False on copies of the app without the website's address, where nobody can pay. */
export const paymentsConfigured = Boolean(WEB_URL);
export const PAYMENTS_OFF = 'Payments aren’t set up on this copy of the app yet.';

/**
 * Opens the website's pay page in an in-app browser and waits until it closes (or sends the
 * person back to the Tickets tab once paid). Reload the bookings afterwards to see what happened.
 */
export async function openPayPage(payToken: string): Promise<void> {
  if (!WEB_URL) throw new BookingError(PAYMENTS_OFF);
  const back = Linking.createURL('tickets');
  const url = `${WEB_URL.replace(/\/+$/, '')}/pay/${encodeURIComponent(payToken)}?return=${encodeURIComponent(back)}`;
  try {
    await WebBrowser.openAuthSessionAsync(url, back);
  } catch {
    throw new BookingError('Couldn’t open the payment page. Try again.');
  }
}

/** Live price for the current selection, about 300 ms after the last change. */
export function useQuote(occurrenceId: string | null, items: Selection, promo: string | null) {
  const key = occurrenceId && items.length ? JSON.stringify([occurrenceId, items, promo]) : null;
  const [result, setResult] = useState<{ key: string; quote: Quote | null; error: string | null } | null>(null);

  useEffect(() => {
    if (!key || !occurrenceId) return;
    let active = true;
    const timer = setTimeout(() => {
      quoteBooking(occurrenceId, items, promo).then(
        (quote) => active && setResult({ key, quote, error: null }),
        (e: unknown) => active && setResult({ key, quote: null, error: e instanceof BookingError ? e.message : NETWORK }),
      );
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // `key` covers occurrenceId, items and promo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = result && result.key === key ? result : null;
  return { loading: key !== null && current === null, quote: current?.quote ?? null, error: current?.error ?? null };
}

/** Re-renders every second while `on`, for hold countdowns. Returns the current time. */
export function useNow(on: boolean): Date {
  const [now, setNow] = useState(() => new Date());
  const tick = useCallback(() => setNow(new Date()), []);
  useEffect(() => {
    if (!on) return;
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [on, tick]);
  return now;
}
