import { useCallback } from 'react';
import type { Database } from '@nikl/supabase';
import { useAuth } from './auth';
import type { Nullable } from './explore';
import { useFocusData } from './focus-data';
import { fetchStoryGroups, setStoryGroups, type StoryGroup } from './stories';
import { supabase } from './supabase';

type FeedRow = Database['public']['Functions']['home_feed']['Returns'][number];
type SuggestedRow = Database['public']['Functions']['suggested_clubs']['Returns'][number];

/**
 * One post in the home feed, by a club (club_* filled in) or a person (user_* filled in).
 * Posts without an event have no event_* fields, date, place or price.
 */
export type FeedPost = Nullable<
  FeedRow,
  | 'caption'
  | 'media_path'
  | 'club_id'
  | 'club_name'
  | 'club_handle'
  | 'club_verified'
  | 'club_category'
  | 'club_logo_url'
  | 'user_id'
  | 'user_name'
  | 'user_username'
  | 'user_avatar_url'
  | 'event_id'
  | 'event_slug'
  | 'event_title'
  | 'event_category'
  | 'poster_url'
  | 'starts_at'
  | 'venue_name'
  | 'area'
  | 'min_price_paise'
>;

/** Who posted: a club or a person, with what the card needs to show them. */
export type PostAuthor =
  | { type: 'club'; id: string; name: string; handle: string; verified: boolean; category: string; logoUrl: string | null }
  | { type: 'user'; id: string; name: string; handle: string; avatarUrl: string | null };

export function postAuthor(post: FeedPost): PostAuthor | null {
  if (post.author_type === 'club' && post.club_id && post.club_handle) {
    return {
      type: 'club',
      id: post.club_id,
      name: post.club_name ?? post.club_handle,
      handle: post.club_handle,
      verified: post.club_verified ?? false,
      category: post.club_category ?? 'other',
      logoUrl: post.club_logo_url,
    };
  }
  if (post.author_type === 'user' && post.user_id && post.user_username) {
    return { type: 'user', id: post.user_id, name: post.user_name ?? post.user_username, handle: post.user_username, avatarUrl: post.user_avatar_url };
  }
  return null;
}

/** A club in "Clubs you might like". */
export type SuggestedClub = Nullable<SuggestedRow, 'kind' | 'area' | 'logo_url'>;

/** The signed-in person, for the "Your plans" bubble. */
export type Me = { id: string; name: string | null; username: string | null; avatar_url: string | null };

export type HomeData = {
  posts: FeedPost[];
  /** Every photo of each person's post, in order (the feed itself only carries the first). */
  photos: Record<string, string[]>;
  stories: StoryGroup[];
  suggestions: SuggestedClub[];
  me: Me | null;
};

/** People's posts can have up to 5 photos. Club posts have one, already in the feed row. */
async function fetchPhotos(posts: FeedPost[]): Promise<Record<string, string[]>> {
  const ids = posts.filter((p) => p.author_type === 'user').map((p) => p.post_id);
  if (!supabase || ids.length === 0) return {};
  const { data, error } = await supabase.from('post_media').select('post_id, url, position').in('post_id', ids);
  if (error) return {};
  const byPost: Record<string, string[]> = {};
  [...data]
    .sort((a, b) => a.position - b.position)
    .forEach((m) => {
      (byPost[m.post_id] ??= []).push(m.url);
    });
  return byPost;
}

async function fetchMe(userId: string | null): Promise<Me | null> {
  if (!supabase || !userId) return null;
  const { data } = await supabase.from('profiles').select('id, name, username, avatar_url').eq('id', userId).maybeSingle();
  return data ?? { id: userId, name: null, username: null, avatar_url: null };
}

/** The feed must load; stories, suggestions and extra photos quietly disappear if they fail. */
async function fetchHome(userId: string | null): Promise<HomeData> {
  if (!supabase) return { posts: [], photos: {}, stories: [], suggestions: [], me: null };
  const client = supabase;
  const [feed, stories, suggestions, me] = await Promise.all([
    client.rpc('home_feed', { p_limit: 40 }),
    fetchStoryGroups(client).catch(() => [] as StoryGroup[]),
    client.rpc('suggested_clubs', { p_limit: 8 }).then(
      ({ data }) => (data ?? []) as SuggestedClub[],
      () => [],
    ),
    fetchMe(userId).catch(() => null),
  ]);
  if (feed.error) throw feed.error;
  const posts = (feed.data ?? []) as FeedPost[];
  const photos = await fetchPhotos(posts).catch(() => ({}));
  setStoryGroups(stories);
  return { posts, photos, stories, suggestions, me };
}

/** Home: the feed, live stories and club suggestions for whoever is signed in. */
export function useHomeFeed() {
  const { loading: authLoading, session } = useAuth();
  const userId = session?.user.id ?? null;
  // Wait for the saved session, so the first load already has this person's follows and likes.
  const load = useCallback(() => fetchHome(userId), [userId]);
  const result = useFocusData(supabase && !authLoading ? `home:${userId ?? 'guest'}` : null, load);
  return { ...result, loading: result.loading || (supabase !== null && authLoading), connected: supabase !== null, signedIn: userId !== null };
}
