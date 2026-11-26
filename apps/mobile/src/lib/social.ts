import { useCallback, useSyncExternalStore } from 'react';
import { Alert, Platform, Share } from 'react-native';
import { router } from 'expo-router';
import type { NiklClient } from '@nikl/supabase';
import { useAuth } from './auth';
import { useFocusData } from './focus-data';
import { supabase } from './supabase';

/**
 * Follow, like and save. Taps show straight away (optimistic), then the database function is
 * called with the state the person wants; on failure the tap is undone and a short message shown.
 *
 * Every screen loads its own data (follows, likes, saves as they were at `fetchedAt`). This module
 * remembers the taps made on this phone, so every screen shows the same state: a tap counts until
 * a load that started after the database confirmed it has come back (which already includes it).
 */

type Kind = 'follow' | 'like' | 'save';
type Entry = {
  /** The latest tap, still being sent. */
  pending?: { on: boolean; seq: number };
  /** The latest state the database confirmed, and when. */
  confirmed?: { on: boolean; seq: number; at: number };
};
type Taps = Record<Kind, ReadonlyMap<string, Entry>>;

const NO_TAPS: Taps = { follow: new Map(), like: new Map(), save: new Map() };
let taps = NO_TAPS;
let seq = 0;
/** Goes up when another person logs in (or out), so late answers for the last person are ignored. */
let generation = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function update(kind: Kind, id: string, change: (entry: Entry) => Entry) {
  const next = new Map(taps[kind]);
  next.set(id, change(next.get(id) ?? {}));
  taps = { ...taps, [kind]: next };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getTaps = () => taps;

// Forget the last person's taps when someone else logs in, or on log out.
let lastUserId: string | null | undefined;
supabase?.auth.onAuthStateChange((_event, session) => {
  const userId = session?.user.id ?? null;
  if (lastUserId !== undefined && userId !== lastUserId) {
    generation += 1;
    taps = NO_TAPS;
    emit();
  }
  lastUserId = userId;
});

function resolve(entry: Entry | undefined, loaded: boolean, fetchedAt: number | null): boolean {
  if (entry?.pending) return entry.pending.on;
  if (entry?.confirmed && (fetchedAt === null || entry.confirmed.at > fetchedAt)) return entry.confirmed.on;
  return loaded;
}

function send(client: NiklClient, kind: Kind, id: string, on: boolean) {
  if (kind === 'follow') return client.rpc('set_follow_club', { p_club_id: id, p_on: on });
  if (kind === 'like') return client.rpc('set_like', { p_post_id: id, p_on: on });
  return client.rpc('set_save', { p_event_id: id, p_on: on });
}

const FAILED_TITLE: Record<Kind, { on: string; off: string }> = {
  follow: { on: 'Couldn’t follow this club', off: 'Couldn’t unfollow this club' },
  like: { on: 'Couldn’t like this post', off: 'Couldn’t remove your like' },
  save: { on: 'Couldn’t save this event', off: 'Couldn’t remove this from Saved' },
};
const OFFLINE = 'Check your internet connection and try again.';

/** The database functions raise short, plain messages ("Log in to …", "That post isn't available."). */
function friendlyMessage(error: { code?: string; message?: string }): string {
  const message = error.message ?? '';
  const ours = error.code === '22023' || error.code === '54000' || (error.code === '42501' && message.startsWith('Log in'));
  return ours && message ? message : OFFLINE;
}

async function run(client: NiklClient, kind: Kind, id: string, on: boolean) {
  const mySeq = ++seq;
  const myGeneration = generation;
  update(kind, id, (entry) => ({ ...entry, pending: { on, seq: mySeq } }));

  let problem: string | null = null;
  try {
    const { error } = await send(client, kind, id, on);
    if (error) problem = friendlyMessage(error);
  } catch {
    problem = OFFLINE;
  }
  if (myGeneration !== generation) return;

  const latest = taps[kind].get(id)?.pending?.seq === mySeq;
  if (problem === null) {
    update(kind, id, (entry) => ({
      pending: latest ? undefined : entry.pending,
      confirmed: entry.confirmed && entry.confirmed.seq > mySeq ? entry.confirmed : { on, seq: mySeq, at: Date.now() },
    }));
  } else if (latest) {
    // Undo the tap: show the last confirmed state, or what the screen loaded.
    update(kind, id, (entry) => ({ ...entry, pending: undefined }));
    Alert.alert(on ? FAILED_TITLE[kind].on : FAILED_TITLE[kind].off, problem);
  }
}

/** A count (likes, followers) with this phone's own tap taken into account. */
export function adjustCount(loadedCount: number, loadedOn: boolean, nowOn: boolean): number {
  return Math.max(0, loadedCount + (nowOn ? 1 : 0) - (loadedOn ? 1 : 0));
}

/**
 * Current follow/like/save state for what a screen loaded, and the actions to change it.
 * Pass the value the screen loaded and its `fetchedAt` (ms). Without a session, actions open login.
 */
export function useSocial() {
  const current = useSyncExternalStore(subscribe, getTaps, getTaps);
  const { loading, session } = useAuth();
  const signedIn = Boolean(session);

  const act = useCallback(
    (kind: Kind, id: string, on: boolean) => {
      // While the saved session is still being read, we don't know yet whether to ask for a login.
      if (!supabase || loading) return;
      if (!signedIn) {
        router.push('/login');
        return;
      }
      void run(supabase, kind, id, on);
    },
    [loading, signedIn],
  );

  return {
    isFollowing: (clubId: string, loaded: boolean, fetchedAt: number | null) => resolve(current.follow.get(clubId), loaded, fetchedAt),
    isLiked: (postId: string, loaded: boolean, fetchedAt: number | null) => resolve(current.like.get(postId), loaded, fetchedAt),
    isSaved: (eventId: string, loaded: boolean, fetchedAt: number | null) => resolve(current.save.get(eventId), loaded, fetchedAt),
    setFollow: (clubId: string, on: boolean) => act('follow', clubId, on),
    setLike: (postId: string, on: boolean) => act('like', postId, on),
    setSave: (eventId: string, on: boolean) => act('save', eventId, on),
  };
}

async function fetchSavedIds(client: NiklClient | null, userId: string | null): Promise<Set<string>> {
  if (!client || !userId) return new Set();
  const { data, error } = await client.from('saves').select('event_id').eq('user_id', userId);
  if (error) throw error;
  return new Set(data.map((s) => s.event_id));
}

/** Ids of the events the signed-in person saved, reloaded whenever the screen comes into focus. */
export function useSavedEventIds() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const load = useCallback(() => fetchSavedIds(supabase, userId), [userId]);
  return useFocusData(supabase && userId ? `saves:${userId}` : null, load);
}

/** "<user id>/<uuid>.jpg": the only shape of post photo path the database accepts (DECISIONS.md S13). */
const POST_PHOTO_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i;

/**
 * Public URL of a post photo. Photos are stored as paths in the public "post-media" bucket; anything
 * else (such as a full link to another site) is ignored, so a post can only show Nikl's own photos.
 */
export function postPhotoUrl(path: string | null | undefined): string | null {
  if (!path || !POST_PHOTO_PATH.test(path)) return null;
  return supabase?.storage.from('post-media').getPublicUrl(path).data.publicUrl ?? null;
}

/**
 * Nikl's public website, e.g. https://nikl.app. Empty until the domain is bought and the site is live
 * (NEXT_STEPS 2.5): until then sharing sends text only, never a link to a domain Nikl doesn't own.
 */
const PUBLIC_SITE = (process.env.EXPO_PUBLIC_SITE_URL ?? '').replace(/\/+$/, '');

export const eventLink = (slug: string): string | null => (/^https:\/\//.test(PUBLIC_SITE) ? `${PUBLIC_SITE}/e/${slug}` : null);

/** Opens the phone's share sheet for an event (with its web link once the site is live). */
export function shareEvent(title: string, slug: string) {
  const url = eventLink(slug);
  const text = `${title} · on Nikl`;
  // iOS shares the link as a rich preview; Android only takes a text message.
  const content = url
    ? Platform.OS === 'ios'
      ? { url, message: title }
      : { title, message: `${title}\n${url}` }
    : { title, message: text };
  Share.share(content).catch(() => {});
}
