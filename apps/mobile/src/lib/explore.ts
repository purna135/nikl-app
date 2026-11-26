import { useCallback, useEffect, useState } from 'react';
import type { Database } from '@nikl/supabase';
import { categoryById, priceSummary } from '@nikl/utils';
import type { TintName } from '@nikl/tokens';
import { supabase } from './supabase';

type ExploreRow = Database['public']['Functions']['explore_events']['Returns'][number];
/** Marks RPC columns that the type generator calls non-null but that can be empty. */
export type Nullable<T, K extends keyof T> = Omit<T, K> & { [P in K]: T[P] | null };

/**
 * One upcoming public event, at its next date. The type generator marks every RPC column as
 * non-null, but these can be empty in the database (no poster, no venue, no tickets, no cap).
 */
export type ExploreEvent = Nullable<
  ExploreRow,
  'poster_url' | 'ends_at' | 'venue_name' | 'area' | 'lat' | 'lng' | 'min_price_paise' | 'spots_left' | 'tags'
>;

const DAY_MS = 24 * 60 * 60 * 1000;
const LOAD_ERROR = 'Couldn’t load events. Check your internet connection and try again.';

type LoadState = { rows: ExploreEvent[]; error: string | null; fetchedAt: Date | null };

/** One load of the next 60 days. Never throws: failures come back as a friendly message. */
async function fetchExplore(previous: ExploreEvent[]): Promise<LoadState> {
  const now = new Date();
  if (!supabase) return { rows: [], error: null, fetchedAt: now };
  try {
    const { data, error } = await supabase.rpc('explore_events', {
      p_from: now.toISOString(),
      p_to: new Date(now.getTime() + 60 * DAY_MS).toISOString(),
    });
    if (error) return { rows: previous, error: LOAD_ERROR, fetchedAt: now };
    return { rows: (data ?? []) as ExploreEvent[], error: null, fetchedAt: now };
  } catch {
    return { rows: previous, error: LOAD_ERROR, fetchedAt: now };
  }
}

/**
 * Every upcoming public event in the next 60 days, soonest first.
 * `fetchedAt` is when the list was loaded; use it as "now" for time filters.
 */
export function useExploreEvents() {
  const [state, setState] = useState<LoadState>({ rows: [], error: null, fetchedAt: null });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    fetchExplore([]).then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const next = await fetchExplore(state.rows);
    setState(next);
    setRefreshing(false);
  }, [state.rows]);

  const connected = supabase !== null;
  return {
    /** False when this build has no Supabase keys, so there is nothing to load. */
    connected,
    loading: connected && state.fetchedAt === null,
    refreshing,
    error: state.error,
    rows: state.rows,
    fetchedAt: state.fetchedAt,
    refresh,
  };
}

/** Emoji, name and tint for an event's category, with a neutral fallback for unknown ids. */
export function categoryLook(id: string): { emoji: string; name: string; short: string; tint: TintName } {
  return categoryById(id) ?? { emoji: '✨', name: 'Other', short: 'Other', tint: 'sky' };
}

/** "Free", "From ₹299", or "Free + paid" when there is a free tier alongside paid ones. */
export function priceLabel(e: Pick<ExploreEvent, 'is_free' | 'min_price_paise'>): string {
  return priceSummary(e.is_free, e.min_price_paise);
}

/** "Venue · Area", or whichever of the two exists. */
export function placeLabel(venue: string | null | undefined, area: string | null | undefined): string {
  return [venue, area].filter(Boolean).join(' · ');
}

/** Does the event match a search box query (title, club, venue or area)? */
export function matchesQuery(e: ExploreEvent, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [e.title, e.club_name, e.venue_name, e.area].some((field) => field?.toLowerCase().includes(q));
}
