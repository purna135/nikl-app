import { useCallback } from 'react';
import type { Database, NiklClient } from '@nikl/supabase';
import { useAuth } from './auth';
import type { Nullable } from './explore';
import { useFocusData } from './focus-data';
import { supabase } from './supabase';

type ProfileRow = Database['public']['Functions']['user_profile']['Returns'][number];

/** A person's public profile, with counts and how you two are connected. */
export type PersonProfile = Nullable<ProfileRow, 'name' | 'avatar_url' | 'bio' | 'area'>;

const PERSON_POST_SELECT =
  'id, caption, created_at, moderation_status, moderation_note, visibility, event_id, events(slug, title, poster_url, category), post_media(url, position)';

/**
 * A person's posts, newest first. Row rules already hide friends-only posts from non-friends,
 * posts between blocked people, and other people's posts that Nikl hasn't checked yet.
 */
function fetchPersonPosts(client: NiklClient, userId: string) {
  return client
    .from('posts')
    .select(PERSON_POST_SELECT)
    .eq('author_type', 'user')
    .eq('author_id', userId)
    .order('created_at', { ascending: false })
    .limit(60);
}

export type PersonPost = NonNullable<Awaited<ReturnType<typeof fetchPersonPosts>>['data']>[number];

/** `profile` is null when there is no such person, or they blocked you. */
export type PersonData = { profile: PersonProfile | null; posts: PersonPost[] };

async function fetchPerson(username: string): Promise<PersonData> {
  if (!supabase) return { profile: null, posts: [] };
  const { data, error } = await supabase.rpc('user_profile', { p_username: username });
  if (error) throw error;
  const profile = ((data ?? [])[0] ?? null) as PersonProfile | null;
  if (!profile || profile.blocked_by_me) return { profile, posts: [] };
  const posts = await fetchPersonPosts(supabase, profile.user_id);
  if (posts.error) throw posts.error;
  return { profile, posts: posts.data };
}

/** A person's profile by username (also used for your own on the You tab). */
export function usePersonProfile(username: string | null | undefined) {
  const { loading: authLoading, session } = useAuth();
  const viewer = session?.user.id ?? 'guest';
  const load = useCallback(() => fetchPerson(username ?? ''), [username]);
  const key = supabase && username && !authLoading ? `user:${username.toLowerCase()}:${viewer}` : null;
  const result = useFocusData(key, load);
  return { ...result, loading: result.loading || (supabase !== null && Boolean(username) && authLoading), connected: supabase !== null };
}

/** A post's photos (storage paths) in order. */
export function postPhotoPaths(post: { post_media: { url: string; position: number }[] }): string[] {
  return [...post.post_media].sort((a, b) => a.position - b.position).map((m) => m.url);
}

const POST_SELECT =
  'id, author_type, author_id, caption, created_at, moderation_status, moderation_note, visibility, event_id, events(slug, title, poster_url, category), post_media(url, position)';

function fetchPostRow(client: NiklClient, id: string) {
  return client.from('posts').select(POST_SELECT).eq('id', id).maybeSingle();
}

export type PostRow = NonNullable<Awaited<ReturnType<typeof fetchPostRow>>['data']>;

/** Who posted a single post, as the post screen shows them. */
export type PostAuthorInfo =
  | { type: 'club'; id: string; name: string; handle: string; verified: boolean; category: string; logoUrl: string | null }
  | { type: 'user'; id: string; name: string; handle: string; avatarUrl: string | null };

/** `post` is null when it doesn't exist or you can't see it (friends only, blocked, being checked). */
export type PostData = { post: PostRow | null; author: PostAuthorInfo | null; likes: number; liked: boolean };

async function fetchPost(id: string, userId: string | null): Promise<PostData> {
  const none = { post: null, author: null, likes: 0, liked: false };
  if (!supabase) return none;
  const client = supabase;
  const { data: post, error } = await fetchPostRow(client, id);
  if (error) throw error;
  if (!post) return none;

  const authorQuery =
    post.author_type === 'club'
      ? client
          .from('clubs')
          .select('id, name, handle, verified, category, logo_url')
          .eq('id', post.author_id)
          .maybeSingle()
          .then(({ data, error: e }): PostAuthorInfo | null => {
            if (e) throw e;
            return data ? { type: 'club', id: data.id, name: data.name, handle: data.handle, verified: data.verified, category: data.category, logoUrl: data.logo_url } : null;
          })
      : client
          .from('profiles')
          .select('id, name, username, avatar_url')
          .eq('id', post.author_id)
          .maybeSingle()
          .then(({ data, error: e }): PostAuthorInfo | null => {
            if (e) throw e;
            return data?.username ? { type: 'user', id: data.id, name: data.name ?? data.username, handle: data.username, avatarUrl: data.avatar_url } : null;
          });

  const [author, likes, liked] = await Promise.all([
    authorQuery,
    // Who liked what is private; the count is public (like_count()).
    client.rpc('like_count', { p_post_id: id }).then(({ data, error: e }) => {
      if (e) throw e;
      return data ?? 0;
    }),
    userId
      ? client
          .from('likes')
          .select('post_id')
          .eq('post_id', id)
          .eq('user_id', userId)
          .maybeSingle()
          .then(({ data, error: e }) => {
            if (e) throw e;
            return data !== null;
          })
      : Promise.resolve(false),
  ]);
  return { post, author, likes, liked };
}

/** One post on its own screen (opened from a profile grid). */
export function usePost(id: string | undefined) {
  const { loading: authLoading, session } = useAuth();
  const userId = session?.user.id ?? null;
  const load = useCallback(() => fetchPost(id ?? '', userId), [id, userId]);
  const key = supabase && id && !authLoading ? `post:${id}:${userId ?? 'guest'}` : null;
  const result = useFocusData(key, load);
  return { ...result, loading: result.loading || (supabase !== null && Boolean(id) && authLoading), connected: supabase !== null };
}
