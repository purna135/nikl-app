import { describe, expect, it } from 'vitest';
import { bookingSection, formatCountdown, stepQuantity, tierAvailability } from './index';

const now = new Date('2026-12-01T10:00:00Z');
const tier = { quantity: 50, sold: 47, sale_starts_at: null, sale_ends_at: null };

describe('tierAvailability', () => {
  it('caps at what is left and at 10', () => {
    expect(tierAvailability(tier, now)).toEqual({ state: 'on_sale', max: 3, left: 3 });
    expect(tierAvailability({ ...tier, quantity: null }, now)).toEqual({ state: 'on_sale', max: 10, left: null });
  });
  it('knows sold out and sale windows', () => {
    expect(tierAvailability({ ...tier, sold: 50 }, now).state).toBe('sold_out');
    expect(tierAvailability({ ...tier, sale_starts_at: '2026-12-02T00:00:00Z' }, now).state).toBe('not_yet');
    expect(tierAvailability({ ...tier, sale_ends_at: '2026-12-01T09:00:00Z' }, now).state).toBe('ended');
  });
});

describe('stepQuantity', () => {
  it('stays within the type and the booking limit', () => {
    expect(stepQuantity(0, 1, 3, 0)).toBe(1);
    expect(stepQuantity(3, 1, 3, 0)).toBe(3);
    expect(stepQuantity(2, 1, 10, 8)).toBe(2);
    expect(stepQuantity(0, -1, 10, 0)).toBe(0);
    expect(stepQuantity(5, -1, 2, 0)).toBe(2);
  });
});

describe('formatCountdown', () => {
  it('shows minutes and seconds, never negative', () => {
    expect(formatCountdown('2026-12-01T10:09:05Z', now)).toBe('9:05');
    expect(formatCountdown('2026-12-01T09:00:00Z', now)).toBe('0:00');
  });
});

describe('bookingSection', () => {
  const base = { pay_token: null, ticket_count: 1, starts_at: '2026-12-05T13:00:00Z', ends_at: null };
  it('sorts bookings into tab sections', () => {
    expect(bookingSection({ ...base, status: 'held', pay_token: 'x' }, now)).toBe('in_progress');
    expect(bookingSection({ ...base, status: 'held' }, now)).toBe('other');
    expect(bookingSection({ ...base, status: 'confirmed' }, now)).toBe('upcoming');
    expect(bookingSection({ ...base, status: 'checked_in', starts_at: '2026-11-01T13:00:00Z' }, now)).toBe('past');
    expect(bookingSection({ ...base, status: 'late_paid', ticket_count: 0 }, now)).toBe('other');
    expect(bookingSection({ ...base, status: 'late_paid' }, now)).toBe('upcoming');
    expect(bookingSection({ ...base, status: 'refunded' }, now)).toBe('other');
  });
});
