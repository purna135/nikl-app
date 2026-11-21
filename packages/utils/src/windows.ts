/**
 * Time filters for Explore ("Today", "Tonight", "This weekend"...), always in India Standard Time.
 * IST is a fixed UTC+05:30 with no daylight saving, so plain offset arithmetic is safe.
 */

const IST_OFFSET_MS = 330 * 60 * 1000;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export type TimeFilter = 'any' | 'now' | 'today' | 'tonight' | 'weekend' | 'week';

export const TIME_FILTERS: ReadonlyArray<{ id: TimeFilter; label: string }> = [
  { id: 'any', label: 'Any time' },
  { id: 'now', label: 'Happening now' },
  { id: 'today', label: 'Today' },
  { id: 'tonight', label: 'Tonight' },
  { id: 'weekend', label: 'This weekend' },
  { id: 'week', label: 'Next 7 days' },
];

/** Midnight (IST) at the start of the IST day containing `t`, as a UTC timestamp in ms. */
function istMidnight(t: number): number {
  const ist = t + IST_OFFSET_MS;
  return ist - (((ist % DAY) + DAY) % DAY) - IST_OFFSET_MS;
}

/** 0 = Sunday … 6 = Saturday, for the IST day containing `t`. */
function istWeekday(t: number): number {
  return new Date(t + IST_OFFSET_MS).getUTCDay();
}

/** The [from, to) range a filter covers. `any` is open-ended. */
export function timeWindow(filter: TimeFilter, now: Date = new Date()): { from: Date; to: Date | null } {
  const t = now.getTime();
  const midnight = istMidnight(t);
  switch (filter) {
    case 'any':
      return { from: now, to: null };
    case 'now':
      return { from: now, to: new Date(t + HOUR) };
    case 'today':
      return { from: now, to: new Date(midnight + DAY) };
    case 'tonight': {
      const fivePm = midnight + 17 * HOUR;
      return { from: new Date(Math.max(t, fivePm)), to: new Date(midnight + DAY) };
    }
    case 'weekend': {
      const wd = istWeekday(t);
      // Saturday 00:00 IST of this week (or today if it's already the weekend) until Monday 00:00 IST
      const daysToSat = wd === 6 ? 0 : wd === 0 ? -1 : 6 - wd;
      const saturday = midnight + daysToSat * DAY;
      return { from: new Date(Math.max(t, saturday)), to: new Date(saturday + 2 * DAY) };
    }
    case 'week':
      return { from: now, to: new Date(t + 7 * DAY) };
  }
}

/**
 * Whether an event date falls in a filter. An event that has started but not ended counts as
 * "now" / "today" too. Without an end time we assume it lasts 2 hours.
 */
export function inTimeWindow(startsAt: string | Date, endsAt: string | Date | null | undefined, filter: TimeFilter, now: Date = new Date()): boolean {
  const start = new Date(startsAt).getTime();
  const end = endsAt ? new Date(endsAt).getTime() : start + 2 * HOUR;
  const { from, to } = timeWindow(filter, now);
  if (end <= now.getTime()) return false; // already over
  if (filter === 'now') return start <= now.getTime() + HOUR; // on now, or starting within the hour
  return end > from.getTime() && (to === null || start < to.getTime());
}
