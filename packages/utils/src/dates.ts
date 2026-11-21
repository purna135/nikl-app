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
