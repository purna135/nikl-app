import type { TintName } from '@nikl/tokens';

/** The 12 top-level categories from PLAN.md §5. The id is what the database stores. */
export const CATEGORIES = [
  { id: 'fitness', name: 'Fitness & Sports', short: 'Fitness', emoji: '🏃', tint: 'mint' },
  { id: 'art', name: 'Art & Craft', short: 'Art & Craft', emoji: '🎨', tint: 'tang' },
  { id: 'music', name: 'Music & Gigs', short: 'Music', emoji: '🎸', tint: 'pink' },
  { id: 'comedy', name: 'Comedy & Stage', short: 'Comedy', emoji: '🎤', tint: 'sun' },
  { id: 'food', name: 'Food & Drinks', short: 'Food', emoji: '🍜', tint: 'tang' },
  { id: 'outdoors', name: 'Outdoors & Travel', short: 'Outdoors', emoji: '🥾', tint: 'mint' },
  { id: 'games', name: 'Games & Hangouts', short: 'Games', emoji: '🎲', tint: 'sky' },
  { id: 'learn', name: 'Learn & Grow', short: 'Learn', emoji: '📚', tint: 'grape' },
  { id: 'dance', name: 'Dance', short: 'Dance', emoji: '💃', tint: 'pink' },
  { id: 'markets', name: 'Markets & Fests', short: 'Markets', emoji: '🛍️', tint: 'sun' },
  { id: 'social', name: 'Social & Volunteering', short: 'Volunteer', emoji: '🤝', tint: 'sky' },
  { id: 'wellness', name: 'Wellness', short: 'Wellness', emoji: '🧘', tint: 'grape' },
] as const satisfies ReadonlyArray<{ id: string; name: string; short: string; emoji: string; tint: TintName }>;

export type CategoryId = (typeof CATEGORIES)[number]['id'];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

export function categoryById(id: string) {
  return CATEGORIES.find((c) => c.id === id);
}

/** Bhubaneswar neighbourhoods offered at onboarding (launch city). */
export const BBSR_AREAS = [
  'Patia',
  'Chandrasekharpur',
  'Saheed Nagar',
  'Jaydev Vihar',
  'Nayapalli',
  'Old Town',
  'Khandagiri',
  'Kharavel Nagar',
] as const;
export type Area = (typeof BBSR_AREAS)[number];
