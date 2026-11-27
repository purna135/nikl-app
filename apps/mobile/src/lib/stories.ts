import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Database, NiklClient } from '@nikl/supabase';
import { groupInOrder } from '@nikl/utils';
import type { Nullable } from './explore';
import { supabase } from './supabase';

type StoryFeedRow = Database['public']['Functions']['story_feed']['Returns'][number];
type Json = StoryFeedRow['template'];

/** One live story. Stories without an event have no event_* fields, date, place or price. */
export type Story = Nullable<
  StoryFeedRow,
  | 'author_avatar_url'
  | 'author_category'
  | 'media_path'
  | 'template'
  | 'event_id'
  | 'event_slug'
  | 'event_title'
  | 'event_category'
  | 'poster_url'
  | 'starts_at'
  | 'area'
  | 'min_price_paise'
>;

/** One author's live stories (oldest first), as one ring in the stories row. */
export type StoryGroup = {
  key: string;
  authorType: 'club' | 'user';
  authorId: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  category: string | null;
  verified: boolean;
  mine: boolean;
  stories: Story[];
};

export const authorKey = (type: string, id: string) => `${type}:${id}`;

/** story_feed() already puts your own first, then unseen, then followed authors. */
export function groupStories(rows: Story[]): StoryGroup[] {
  return groupInOrder(rows, (s) => authorKey(s.author_type, s.author_id)).map(({ key, items }) => {
    const first = items[0]!;
    return {
      key,
      authorType: first.author_type === 'user' ? 'user' : 'club',
      authorId: first.author_id,
      name: first.author_name,
      handle: first.author_handle,
      avatarUrl: first.author_avatar_url,
      category: first.author_category,
      verified: first.author_verified,
      mine: first.mine,
      stories: items,
    };
  });
}

export async function fetchStoryGroups(client: NiklClient): Promise<StoryGroup[]> {
  const { data, error } = await client.rpc('story_feed');
  if (error) throw error;
  return groupStories((data ?? []) as Story[]);
}

/** What a story card says: the chip at the top ("New", "Going") and the person's note. */
export function storyTemplate(template: Json | null): { kicker: string | null; note: string | null } {
  const t = template && typeof template === 'object' && !Array.isArray(template) ? template : {};
  const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return { kicker: text(t.kicker), note: text(t.note) };
}

// ---------------------------------------------------------------------------------------------
// Shared between the stories row and the viewer: the groups Home loaded, and what was watched since.
// ---------------------------------------------------------------------------------------------

/** `loadedAt` (ms) is when the groups were loaded, for "2h ago". */
type State = { groups: StoryGroup[]; seen: ReadonlySet<string>; loadedAt: number };
let state: State = { groups: [], seen: new Set(), loadedAt: 0 };
/** Stories watched but not yet sent to the database. */
let unsent = new Set<string>();
const listeners = new Set<() => void>();

function emit(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getState = () => state;

// Another person on this phone hasn't watched anything yet.
let lastUserId: string | null | undefined;
supabase?.auth.onAuthStateChange((_event, session) => {
  const userId = session?.user.id ?? null;
  if (lastUserId !== undefined && userId !== lastUserId) {
    unsent = new Set();
    emit({ groups: [], seen: new Set(), loadedAt: 0 });
  }
  lastUserId = userId;
});

/** Home calls this with each load, so the viewer opens on exactly what the row shows. */
export function setStoryGroups(groups: StoryGroup[]) {
  if (groups !== state.groups) emit({ ...state, groups, loadedAt: Date.now() });
}

export function useStoryState(): State {
  return useSyncExternalStore(subscribe, getState, getState);
}

export const isSeen = (story: Story, seen: ReadonlySet<string>) => story.seen || seen.has(story.story_id);

/** "unseen" (accent ring) while any story in the group is new to you, else "seen" (grey ring). */
export const ringFor = (group: StoryGroup, seen: ReadonlySet<string>): 'unseen' | 'seen' =>
  group.stories.every((s) => isSeen(s, seen)) ? 'seen' : 'unseen';

/** Marks a story as watched on this phone straight away; `sendSeen` tells the database later. */
export function markSeen(storyId: string) {
  if (state.seen.has(storyId)) return;
  unsent.add(storyId);
  emit({ ...state, seen: new Set(state.seen).add(storyId) });
}

/** Sends the watched stories to the database in one call (when a group ends or the viewer closes). */
export function sendSeen() {
  if (!supabase || unsent.size === 0) return;
  const ids = [...unsent];
  unsent = new Set();
  supabase.auth.getSession().then(({ data }) => {
    // Without a login there is nowhere to keep them; the rings still turn grey on this phone.
    if (!data.session || !supabase) return;
    // On failure, keep them for the next send so watched stories don't turn "new" again.
    const keep = () => ids.forEach((id) => unsent.add(id));
    supabase.rpc('mark_stories_seen', { p_story_ids: ids }).then(({ error }) => {
      if (error) keep();
    }, keep);
  });
}

/**
 * The groups for the viewer: what Home loaded, or (opened from a link, before Home loaded) a fresh
 * load. `null` while loading; `failed` when that load didn't work.
 */
export function useViewerGroups() {
  const { groups, loadedAt } = useStoryState();
  const [own, setOwn] = useState<{ groups: StoryGroup[] | null; failed: boolean; loadedAt: number }>({ groups: null, failed: false, loadedAt: 0 });
  const needLoad = groups.length === 0;

  useEffect(() => {
    if (!needLoad || !supabase) return;
    let active = true;
    fetchStoryGroups(supabase).then(
      (loaded) => {
        if (active) setOwn({ groups: loaded, failed: false, loadedAt: Date.now() });
      },
      () => {
        if (active) setOwn({ groups: [], failed: true, loadedAt: Date.now() });
      },
    );
    return () => {
      active = false;
    };
  }, [needLoad]);

  if (!needLoad) return { groups, failed: false, loadedAt };
  return { groups: supabase ? own.groups : [], failed: own.failed, loadedAt: own.loadedAt };
}

/** Leaves out stories deleted and people blocked since Home loaded, and authors with nothing left. */
export function visibleStoryGroups(groups: StoryGroup[], hidden: { stories: ReadonlySet<string>; users: ReadonlySet<string> }): StoryGroup[] {
  if (hidden.stories.size === 0 && hidden.users.size === 0) return groups;
  return groups.flatMap((g) => {
    if (g.authorType === 'user' && hidden.users.has(g.authorId)) return [];
    const stories = g.stories.filter((s) => !hidden.stories.has(s.story_id));
    if (stories.length === 0) return [];
    return [stories.length === g.stories.length ? g : { ...g, stories }];
  });
}
