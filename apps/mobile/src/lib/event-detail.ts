import { useEffect, useState } from 'react';
import type { NiklClient } from '@nikl/supabase';
import { supabase } from './supabase';

const EVENT_SELECT =
  'id, title, slug, description, poster_url, category, tags, clubs(name, handle, verified), venues(name, address, area, lat, lng), event_occurrences(id, starts_at, ends_at, status, capacity, seats_taken, ticket_tiers(id, name, price_paise, quantity, sold, position, seats_per_ticket, sale_starts_at, sale_ends_at))';

/** Row-level security only returns published events of approved clubs to the public. */
function fetchEventBySlug(client: NiklClient, slug: string) {
  return client.from('events').select(EVENT_SELECT).eq('slug', slug).maybeSingle();
}

export type EventDetail = NonNullable<Awaited<ReturnType<typeof fetchEventBySlug>>['data']>;
export type EventDate = EventDetail['event_occurrences'][number];

type Status = 'offline' | 'loading' | 'ready' | 'notfound' | 'error';
type Result = { key: string; status: Exclude<Status, 'offline' | 'loading'>; event: EventDetail | null; loadedAt: Date };

/** Loads one event by its slug. `retry()` loads it again after an error. */
export function useEventDetail(slug: string | undefined) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${slug ?? ''}#${attempt}`;

  useEffect(() => {
    if (!supabase || !slug) return;
    let active = true;
    fetchEventBySlug(supabase, slug).then(
      ({ data, error }) => {
        if (!active) return;
        setResult({ key, status: error ? 'error' : data ? 'ready' : 'notfound', event: data ?? null, loadedAt: new Date() });
      },
      () => {
        if (active) setResult({ key, status: 'error', event: null, loadedAt: new Date() });
      },
    );
    return () => {
      active = false;
    };
  }, [slug, key]);

  let status: Status;
  if (!supabase) status = 'offline';
  else if (!slug) status = 'notfound';
  else if (result?.key === key) status = result.status;
  else status = 'loading';

  return {
    status,
    event: status === 'ready' ? (result?.event ?? null) : null,
    /** When the event was loaded; use it as "now" to hide dates that are over. */
    loadedAt: result?.loadedAt ?? null,
    retry: () => setAttempt((a) => a + 1),
  };
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/** Scheduled dates that haven't finished yet, soonest first, with ticket tiers in display order. */
export function upcomingDates(event: EventDetail, now: Date): EventDate[] {
  return event.event_occurrences
    .filter((o) => {
      if (o.status !== 'scheduled') return false;
      const end = o.ends_at ? new Date(o.ends_at).getTime() : new Date(o.starts_at).getTime() + TWO_HOURS_MS;
      return end > now.getTime();
    })
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .map((o) => ({ ...o, ticket_tiers: [...o.ticket_tiers].sort((a, b) => a.position - b.position) }));
}

/** "12 spots left", "Full", or null when the club didn't set a capacity. */
export function spotsLabel(capacity: number | null, taken: number): string | null {
  if (capacity === null) return null;
  const left = Math.max(capacity - taken, 0);
  if (left === 0) return 'Full';
  return left === 1 ? '1 spot left' : `${left} spots left`;
}
