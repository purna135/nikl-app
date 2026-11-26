/**
 * All event times are stored as UTC timestamps and shown in India Standard Time,
 * whatever timezone the user's phone or browser is set to.
 */

export const IST = 'Asia/Kolkata';

const dayFmt = new Intl.DateTimeFormat('en-IN', { timeZone: IST, weekday: 'short', day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('en-IN', { timeZone: IST, hour: 'numeric', minute: '2-digit', hour12: true });

/** "Sat, 21 Nov" */
export function formatEventDay(date: Date | string): string {
  const parts = dayFmt.formatToParts(new Date(date));
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('weekday')}, ${get('day')} ${get('month')}`;
}

/** "7:30 PM" */
export function formatEventTime(date: Date | string): string {
  return timeFmt.format(new Date(date)).replace(/\s?(am|pm)$/i, (m) => ` ${m.trim().toUpperCase()}`);
}

/** "Sat, 21 Nov · 7:30 PM" */
export function formatEventWhen(date: Date | string): string {
  return `${formatEventDay(date)} · ${formatEventTime(date)}`;
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const dateFmt = new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: 'numeric', month: 'short', year: 'numeric' });

/**
 * How long ago something was posted, the short way feeds show it: "Just now", "5m", "2h", "3d", "2w".
 * After 5 weeks it shows the date in IST: "21 Nov", with the year if it isn't this year ("21 Nov 2025").
 * Times in the future (a phone clock that is behind) count as "Just now".
 */
export function formatTimeAgo(date: Date | string, now: Date = new Date()): string {
  const then = new Date(date);
  const ms = now.getTime() - then.getTime();
  if (ms < MINUTE_MS) return 'Just now';
  if (ms < HOUR_MS) return `${Math.floor(ms / MINUTE_MS)}m`;
  if (ms < DAY_MS) return `${Math.floor(ms / HOUR_MS)}h`;
  if (ms < WEEK_MS) return `${Math.floor(ms / DAY_MS)}d`;
  if (ms < 5 * WEEK_MS) return `${Math.floor(ms / WEEK_MS)}w`;
  const parts = dateFmt.formatToParts(then);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? '';
  const sameYear = get('year') === dateFmt.formatToParts(now).find((p) => p.type === 'year')?.value;
  return sameYear ? `${get('day')} ${get('month')}` : `${get('day')} ${get('month')} ${get('year')}`;
}
