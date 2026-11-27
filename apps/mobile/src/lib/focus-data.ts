import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

type Loaded<T> = { key: string; data: T | null; failed: boolean; fetchedAt: number };

async function attempt<T>(key: string, load: () => Promise<T>): Promise<Loaded<T>> {
  const fetchedAt = Date.now();
  try {
    return { key, data: await load(), failed: false, fetchedAt };
  } catch {
    return { key, data: null, failed: true, fetchedAt };
  }
}

/** Keeps the newest result. A failed reload keeps what was already on screen. */
function merge<T>(prev: Loaded<T> | null, next: Loaded<T>): Loaded<T> {
  if (!prev) return next;
  // A late answer (e.g. a refresh for the person who just logged out) never replaces a newer one.
  if (next.fetchedAt < prev.fetchedAt) return prev;
  if (prev.key !== next.key) return next;
  return next.failed && prev.data !== null ? { ...prev, failed: true } : next;
}

/** Coming back to a screen reloads it, unless its data is fresher than this. Pull to refresh always reloads. */
const FRESH_MS = 30_000;

/** When each kind of screen data (a key prefix such as "home:") last went out of date. */
const staleSince = new Map<string, number>();

/**
 * Marks screen data as out of date, e.g. after a new post or a block: every screen whose key starts
 * with one of these prefixes reloads the next time it comes into focus, however fresh its data is.
 */
export function invalidate(...prefixes: string[]) {
  const now = Date.now();
  prefixes.forEach((prefix) => staleSince.set(prefix, now));
}

function isStale(key: string, fetchedAt: number): boolean {
  for (const [prefix, at] of staleSince) {
    if (key.startsWith(prefix) && at >= fetchedAt) return true;
  }
  return false;
}

/**
 * Loads a screen's data each time the screen comes into focus: when it first opens, when the
 * person comes back from another screen and when the login sheet closes. That keeps follows,
 * likes and saves made on other screens in step without a global cache.
 *
 * `key` names what is loaded (include the signed-in user, so another person never sees the last
 * person's likes); pass null to load nothing. `load` must be stable and throw on failure.
 * `fetchedAt` is when the shown data was requested (ms), for lining it up with taps made since.
 */
export function useFocusData<T>(key: string | null, load: () => Promise<T>) {
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef<Loaded<T> | null>(null);
  useEffect(() => {
    latest.current = loaded;
  }, [loaded]);

  useFocusEffect(
    useCallback(() => {
      if (key === null) return;
      const last = latest.current;
      const fresh = last && last.key === key && !last.failed && Date.now() - last.fetchedAt < FRESH_MS;
      if (fresh && !isStale(key, last.fetchedAt)) return;
      let active = true;
      attempt(key, load).then((next) => {
        if (active) setLoaded((prev) => merge(prev, next));
      });
      return () => {
        active = false;
      };
    }, [key, load]),
  );

  const refresh = useCallback(async () => {
    if (key === null) return;
    setRefreshing(true);
    const next = await attempt(key, load);
    setLoaded((prev) => merge(prev, next));
    setRefreshing(false);
  }, [key, load]);

  const current = loaded && loaded.key === key ? loaded : null;
  return {
    /** True until the first load for this key has finished. */
    loading: key !== null && current === null,
    refreshing,
    data: current?.data ?? null,
    /** The last load failed (any earlier data is still in `data`). */
    failed: current?.failed ?? false,
    fetchedAt: current?.fetchedAt ?? null,
    refresh,
  };
}
