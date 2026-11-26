import type { Database, NiklClient } from '@nikl/supabase';
import { useAuth } from './auth';
import type { Nullable } from './explore';
import { useFocusData } from './focus-data';
import { supabase } from './supabase';

type FeedRow = Database['public']['Functions']['home_feed']['Returns'][number];
type SuggestedRow = Database['public']['Functions']['suggested_clubs']['Returns'][number];

/** One post in the home feed. Posts without an event have no event_* fields, date, place or price. */
export type FeedPost = Nullable<
  FeedRow,
  | 'caption'
  | 'media_path'
  | 'club_logo_url'
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

/** A club in "Clubs you might like". */
export type SuggestedClub = Nullable<SuggestedRow, 'kind' | 'area' | 'logo_url'>;

/** A club with a live story (one per club, newest story first). */
export type StoryClub = { id: string; name: string; handle: string; category: string; logo_url: string | null };

export type HomeData = { posts: FeedPost[]; stories: StoryClub[]; suggestions: SuggestedClub[] };

/** Clubs with live stories. Row rules already hide unapproved and expired stories. */
async function fetchStoryClubs(client: NiklClient): Promise<StoryClub[]> {
  const { data: stories, error } = await client
    .from('stories')
    .select('id, author_id, template, expires_at')
    .eq('author_type', 'club')
    .eq('moderation_status', 'approved')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(100);
  if (error || stories.length === 0) return [];
  const ids = [...new Set(stories.map((s) => s.author_id))];
  const { data: clubs, error: clubsError } = await client.from('clubs').select('id, name, handle, category, logo_url').in('id', ids);
  if (clubsError) return [];
  const byId = new Map(clubs.map((c) => [c.id, c]));
  return ids.flatMap((id) => {
    const club = byId.get(id);
    return club ? [club] : [];
  });
}

/** The feed must load; stories and suggestions are extras that quietly disappear if they fail. */
async function fetchHome(): Promise<HomeData> {
  if (!supabase) return { posts: [], stories: [], suggestions: [] };
  const [feed, stories, suggestions] = await Promise.all([
    supabase.rpc('home_feed', { p_limit: 40 }),
    fetchStoryClubs(supabase).catch(() => []),
    supabase.rpc('suggested_clubs', { p_limit: 8 }).then(
      ({ data }) => (data ?? []) as SuggestedClub[],
      () => [],
    ),
  ]);
  if (feed.error) throw feed.error;
  return { posts: (feed.data ?? []) as FeedPost[], stories, suggestions };
}

/** Home: the feed, live club stories and club suggestions for whoever is signed in. */
export function useHomeFeed() {
  const { loading: authLoading, session } = useAuth();
  const viewer = session?.user.id ?? 'guest';
  // Wait for the saved session, so the first load already has this person's follows and likes.
  const result = useFocusData(supabase && !authLoading ? `home:${viewer}` : null, fetchHome);
  return { ...result, loading: result.loading || (supabase !== null && authLoading), connected: supabase !== null };
}
