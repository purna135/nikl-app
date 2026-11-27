import { useCallback } from 'react';
import type { NiklClient } from '@nikl/supabase';
import { useAuth } from './auth';
import { useFocusData } from './focus-data';
import { supabase } from './supabase';

const CLUB_SELECT = 'id, name, handle, kind, category, area, bio, verified, logo_url, rating_avg, rating_count, review_status';
const POST_SELECT = 'id, kind, caption, created_at, event_id, events(slug, title, poster_url, category), post_media(url, position)';

/** Row-level security only returns approved clubs (plus a team's own club) to the public. */
function fetchClubRow(client: NiklClient, handle: string) {
  return client.from('clubs').select(CLUB_SELECT).eq('handle', handle).maybeSingle();
}

function fetchClubPosts(client: NiklClient, clubId: string) {
  return client
    .from('posts')
    .select(POST_SELECT)
    .eq('author_type', 'club')
    .eq('author_id', clubId)
    .eq('moderation_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(60);
}

export type ClubProfile = NonNullable<Awaited<ReturnType<typeof fetchClubRow>>['data']>;
export type ClubPost = NonNullable<Awaited<ReturnType<typeof fetchClubPosts>>['data']>[number];

/** `club` is null when there is no (visible) club with that handle. */
export type ClubData = { club: ClubProfile | null; followers: number; following: boolean; posts: ClubPost[] };

async function fetchClub(handle: string, userId: string | null): Promise<ClubData> {
  if (!supabase) return { club: null, followers: 0, following: false, posts: [] };
  const { data: club, error } = await fetchClubRow(supabase, handle);
  if (error) throw error;
  if (!club) return { club: null, followers: 0, following: false, posts: [] };

  const [followers, posts, mine] = await Promise.all([
    // Follow lists are private (DECISIONS.md P19); the count is public through follower_count().
    supabase.rpc('follower_count', { p_target_type: 'club', p_target_id: club.id }),
    fetchClubPosts(supabase, club.id),
    userId
      ? supabase
          .from('follows')
          .select('target_id')
          .eq('follower_id', userId)
          .eq('target_type', 'club')
          .eq('target_id', club.id)
          .maybeSingle()
          .then(({ data, error: mineError }) => {
            if (mineError) throw mineError;
            return data !== null;
          })
      : Promise.resolve(false),
  ]);
  if (followers.error) throw followers.error;
  if (posts.error) throw posts.error;
  return { club, followers: followers.data ?? 0, following: mine, posts: posts.data };
}

/** A club's profile by handle: details, follower count, whether you follow it, and its posts. */
export function useClubProfile(handle: string | undefined) {
  const { loading: authLoading, session } = useAuth();
  const userId = session?.user.id ?? null;
  const load = useCallback(() => fetchClub(handle ?? '', userId), [handle, userId]);
  const key = supabase && handle && !authLoading ? `club:${handle}:${userId ?? 'guest'}` : null;
  const result = useFocusData(key, load);
  return { ...result, loading: result.loading || (supabase !== null && Boolean(handle) && authLoading), connected: supabase !== null };
}

/** The photo to show for a post: its first photo's storage path, if it has one. */
export function firstPhotoPath(post: ClubPost): string | null {
  const [first] = [...post.post_media].sort((a, b) => a.position - b.position);
  return first?.url ?? null;
}
