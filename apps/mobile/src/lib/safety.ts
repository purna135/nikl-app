import { useSyncExternalStore } from 'react';
import type { Database } from '@nikl/supabase';
import { invalidate } from './focus-data';
import { removePhotos } from './media';
import { forgetFollowUser, friendlyMessage, OFFLINE } from './social';
import { supabase } from './supabase';

/**
 * Report, block and delete (DECISIONS.md S6). Each call returns null when it worked, or a short
 * message to show. What was blocked or deleted disappears from every screen at once.
 */

export type ReportTarget = Database['public']['Enums']['report_target'];

export const REPORT_REASONS = [
  { id: 'spam', label: 'Spam', hint: 'Ads, fake likes or the same thing again and again' },
  { id: 'nudity', label: 'Nudity or sexual content', hint: null },
  { id: 'violence', label: 'Violence or dangerous acts', hint: null },
  { id: 'harassment', label: 'Bullying or harassment', hint: 'Picking on someone, threats, sharing private details' },
  { id: 'hate', label: 'Hate speech or symbols', hint: null },
  { id: 'scam', label: 'Scam or fraud', hint: 'Asking for money or details, fake tickets' },
  { id: 'false_info', label: 'False information', hint: 'Wrong dates, prices or places, or a made-up event' },
  { id: 'other', label: 'Something else', hint: null },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['id'];

/** How long the optional "anything else?" note on a report can be (the database allows 1,000). */
export const REPORT_DETAILS_MAX = 500;

async function attempt(call: () => PromiseLike<{ error: { code?: string; message?: string } | null }>): Promise<string | null> {
  if (!supabase) return OFFLINE;
  try {
    const { error } = await call();
    return error ? friendlyMessage(error) : null;
  } catch {
    return OFFLINE;
  }
}

export function reportContent(type: ReportTarget, id: string, reason: ReportReason, details: string): Promise<string | null> {
  const note = details.trim();
  return attempt(() =>
    supabase!.rpc('report_content', { p_target_type: type, p_target_id: id, p_reason: reason, ...(note ? { p_details: note } : {}) }),
  );
}

// ---------------------------------------------------------------------------------------------
// What this phone has hidden since the screens loaded: deleted posts and stories, blocked people.
// ---------------------------------------------------------------------------------------------

type Hidden = { posts: ReadonlySet<string>; stories: ReadonlySet<string>; users: ReadonlySet<string> };
const NOTHING: Hidden = { posts: new Set(), stories: new Set(), users: new Set() };
let hidden = NOTHING;
const listeners = new Set<() => void>();

function change(kind: keyof Hidden, id: string, on: boolean) {
  const next = new Set(hidden[kind]);
  if (on) next.add(id);
  else next.delete(id);
  hidden = { ...hidden, [kind]: next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getHidden = () => hidden;

// Another person on this phone starts with nothing hidden.
let lastUserId: string | null | undefined;
supabase?.auth.onAuthStateChange((_event, session) => {
  const userId = session?.user.id ?? null;
  if (lastUserId !== undefined && userId !== lastUserId) {
    hidden = NOTHING;
    listeners.forEach((listener) => listener());
  }
  lastUserId = userId;
});

/** Posts, stories and people to leave out of what a screen loaded. */
export function useHidden(): Hidden {
  return useSyncExternalStore(subscribe, getHidden, getHidden);
}

/** Every screen that shows posts, stories or people. */
const SOCIAL_SCREENS = ['home:', 'user:', 'post:'];

/** Blocks or unblocks a person. Blocking also removes follows both ways and hides them everywhere. */
export async function setBlock(userId: string, on: boolean): Promise<string | null> {
  const problem = await attempt(() => supabase!.rpc('set_block', { p_user_id: userId, p_on: on }));
  if (problem) return problem;
  change('users', userId, on);
  if (on) forgetFollowUser(userId);
  invalidate(...SOCIAL_SCREENS);
  return null;
}

/** Deletes one of your own posts and its photos. */
export async function deleteMyPost(userId: string, postId: string): Promise<string | null> {
  if (!supabase) return OFFLINE;
  const client = supabase;
  try {
    const { data: media, error: mediaError } = await client.from('post_media').select('url').eq('post_id', postId);
    if (mediaError) return friendlyMessage(mediaError);
    // Only remove photos once the post itself is really gone (a refused delete returns no rows, not an error).
    const { data: gone, error } = await client.from('posts').delete().eq('id', postId).select('id');
    if (error) return friendlyMessage(error);
    if (!gone || gone.length === 0) return 'That post couldn’t be deleted. Pull down to refresh and try again.';
    await removePhotos(
      client,
      userId,
      media.map((m) => m.url),
    );
  } catch {
    return OFFLINE;
  }
  change('posts', postId, true);
  invalidate(...SOCIAL_SCREENS);
  return null;
}

/** Deletes one of your own stories and its photo. */
export async function deleteMyStory(userId: string, storyId: string, mediaPath: string | null): Promise<string | null> {
  if (!supabase) return OFFLINE;
  const client = supabase;
  let deleted = false;
  const problem = await attempt(async () => {
    const result = await client.from('stories').delete().eq('id', storyId).select('id');
    deleted = (result.data?.length ?? 0) > 0;
    return result;
  });
  if (problem) return problem;
  if (!deleted) return 'That story couldn’t be deleted. Try again.';
  await removePhotos(client, userId, [mediaPath]);
  change('stories', storyId, true);
  invalidate('home:');
  return null;
}
