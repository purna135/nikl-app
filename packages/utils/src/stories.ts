/**
 * Story viewer helpers. Stories come one row per story; the viewer shows them in groups (one per
 * author), each story for a few seconds, then moves on to the next author.
 */

/** Groups rows by key, in the order each key first appears: [a1, b1, a2] → [[a1, a2], [b1]]. */
export function groupInOrder<T>(rows: readonly T[], keyOf: (row: T) => string): { key: string; items: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const items = groups.get(key);
    if (items) items.push(row);
    else groups.set(key, [row]);
  }
  return [...groups].map(([key, items]) => ({ key, items }));
}

/** Where the viewer is: which author's group, and which of their stories. */
export type StoryPosition = { group: number; story: number };

/**
 * The story after this one: the next in the same group, else the first story of the next group.
 * Null after the very last story (the viewer closes). `sizes` is the number of stories in each group.
 */
export function nextStory(sizes: readonly number[], at: StoryPosition): StoryPosition | null {
  if (at.story + 1 < (sizes[at.group] ?? 0)) return { group: at.group, story: at.story + 1 };
  for (let group = at.group + 1; group < sizes.length; group++) {
    if ((sizes[group] ?? 0) > 0) return { group, story: 0 };
  }
  return null;
}

/**
 * The story before this one: the previous in the same group, else the first story of the previous
 * group. At the very first story it stays there (the story starts again).
 */
export function previousStory(sizes: readonly number[], at: StoryPosition): StoryPosition {
  if (at.story > 0) return { group: at.group, story: at.story - 1 };
  for (let group = at.group - 1; group >= 0; group--) {
    if ((sizes[group] ?? 0) > 0) return { group, story: 0 };
  }
  return { group: at.group, story: 0 };
}

/** Where to start watching a group: its first story you haven't seen, or the first one if you've seen them all. */
export function firstUnseen(seen: readonly boolean[]): number {
  const i = seen.indexOf(false);
  return i === -1 ? 0 : i;
}

/**
 * The width to shrink a photo to before uploading (its height follows, keeping the shape), or null
 * when it is already narrow enough. A width of 0 (the phone didn't say) is treated as too wide.
 */
export function shrinkWidth(width: number, maxWidth = 1080): number | null {
  return width > 0 && width <= maxWidth ? null : maxWidth;
}
