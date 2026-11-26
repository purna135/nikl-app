import { describe, expect, it } from 'vitest';
import {
  bookingFeePaise,
  cartTotals,
  formatEventWhen,
  formatIndianPhone,
  formatTimeAgo,
  formatPaise,
  normalizeIndianPhone,
  inTimeWindow,
  priceSummary,
  slugify,
  stackBySpot,
  stackOffsetPx,
  timeWindow,
} from './index';

describe('money', () => {
  it('formats paise as rupees with Indian grouping', () => {
    expect(formatPaise(0)).toBe('Free');
    expect(formatPaise(0, { zeroAsFree: false })).toBe('₹0');
    expect(formatPaise(19900)).toBe('₹199');
    expect(formatPaise(149900)).toBe('₹1,499');
    expect(formatPaise(12345678)).toBe('₹1,23,456.78');
  });

  it('rejects non-integer or negative amounts', () => {
    expect(() => formatPaise(1.5)).toThrow();
    expect(() => formatPaise(-100)).toThrow();
  });

  it('charges a 4% booking fee rounded to the rupee', () => {
    expect(bookingFeePaise(0)).toBe(0);
    expect(bookingFeePaise(19900)).toBe(800); // 4% of ₹199 = ₹7.96 → ₹8
    expect(bookingFeePaise(69900)).toBe(2800); // ₹27.96 → ₹28
  });

  it('totals a cart', () => {
    expect(cartTotals([{ unitPricePaise: 19900, qty: 1 }])).toEqual({ subtotalPaise: 19900, feePaise: 800, totalPaise: 20700 });
    expect(cartTotals([{ unitPricePaise: 0, qty: 2 }])).toEqual({ subtotalPaise: 0, feePaise: 0, totalPaise: 0 });
    expect(() => cartTotals([{ unitPricePaise: 100, qty: -1 }])).toThrow();
  });
});

describe('phone', () => {
  it('normalizes what people type into E.164', () => {
    expect(normalizeIndianPhone('98765 43210')).toBe('+919876543210');
    expect(normalizeIndianPhone('+91-98765-43210')).toBe('+919876543210');
    expect(normalizeIndianPhone('098765 43210')).toBe('+919876543210');
    expect(normalizeIndianPhone('919876543210')).toBe('+919876543210');
  });

  it('rejects numbers that are not Indian mobiles', () => {
    expect(normalizeIndianPhone('12345 67890')).toBeNull();
    expect(normalizeIndianPhone('98765')).toBeNull();
    expect(normalizeIndianPhone('')).toBeNull();
  });

  it('formats for display', () => {
    expect(formatIndianPhone('+919876543210')).toBe('+91 98765 43210');
  });
});

describe('dates', () => {
  it('shows times in IST regardless of the machine timezone', () => {
    // 14:00 UTC = 7:30 PM IST
    expect(formatEventWhen('2026-11-21T14:00:00Z')).toBe('Sat, 21 Nov · 7:30 PM');
    // 00:30 UTC = 6:00 AM IST
    expect(formatEventWhen('2026-11-22T00:30:00Z')).toBe('Sun, 22 Nov · 6:00 AM');
  });

  it('says how long ago a post was made', () => {
    const now = new Date('2026-11-27T12:00:00Z');
    expect(formatTimeAgo('2026-11-27T11:59:30Z', now)).toBe('Just now');
    expect(formatTimeAgo('2026-11-27T12:05:00Z', now)).toBe('Just now'); // phone clock behind
    expect(formatTimeAgo('2026-11-27T11:55:00Z', now)).toBe('5m');
    expect(formatTimeAgo('2026-11-27T10:00:00Z', now)).toBe('2h');
    expect(formatTimeAgo(new Date('2026-11-24T09:00:00Z'), now)).toBe('3d');
    expect(formatTimeAgo('2026-11-13T12:00:00Z', now)).toBe('2w');
    // After 5 weeks: the date in IST (00:30 IST on 1 Oct is still 30 Sep in UTC)
    expect(formatTimeAgo('2026-09-30T19:00:00Z', now)).toBe('1 Oct');
    expect(formatTimeAgo('2025-12-25T06:00:00Z', now)).toBe('25 Dec 2025');
  });
});

describe('slugify', () => {
  it('makes URL-safe slugs', () => {
    expect(slugify('Full Moon 10K: Night Run!')).toBe('full-moon-10k-night-run');
    expect(slugify('Pottery & Chai')).toBe('pottery-and-chai');
  });
});

describe('time windows (IST)', () => {
  // Saturday 21 Nov 2026, 10:00 IST = 04:30 UTC
  const satMorning = new Date('2026-11-21T04:30:00Z');
  // Wednesday 25 Nov 2026, 18:30 IST = 13:00 UTC
  const wedEvening = new Date('2026-11-25T13:00:00Z');

  it('today ends at midnight IST', () => {
    expect(timeWindow('today', satMorning).to?.toISOString()).toBe('2026-11-21T18:30:00.000Z');
  });

  it('tonight starts at 5 PM IST (or now if later)', () => {
    expect(timeWindow('tonight', satMorning).from.toISOString()).toBe('2026-11-21T11:30:00.000Z');
    expect(timeWindow('tonight', wedEvening).from.toISOString()).toBe(wedEvening.toISOString());
  });

  it('this weekend on a Saturday runs from now to Monday 00:00 IST', () => {
    const w = timeWindow('weekend', satMorning);
    expect(w.from.toISOString()).toBe(satMorning.toISOString());
    expect(w.to?.toISOString()).toBe('2026-11-22T18:30:00.000Z');
  });

  it('this weekend on a Wednesday means the coming Saturday and Sunday', () => {
    const w = timeWindow('weekend', wedEvening);
    expect(w.from.toISOString()).toBe('2026-11-27T18:30:00.000Z'); // Sat 28 Nov 00:00 IST
    expect(w.to?.toISOString()).toBe('2026-11-29T18:30:00.000Z');
  });

  it('matches events to filters', () => {
    // Sat 21 Nov 7:30 PM IST
    expect(inTimeWindow('2026-11-21T14:00:00Z', null, 'tonight', satMorning)).toBe(true);
    // Sun 22 Nov 6 AM IST: weekend, not today
    expect(inTimeWindow('2026-11-22T00:30:00Z', null, 'weekend', satMorning)).toBe(true);
    expect(inTimeWindow('2026-11-22T00:30:00Z', null, 'today', satMorning)).toBe(false);
    // Already over
    expect(inTimeWindow('2026-11-21T01:00:00Z', '2026-11-21T02:00:00Z', 'today', satMorning)).toBe(false);
    // Started an hour ago, still going: happening now
    expect(inTimeWindow('2026-11-21T03:30:00Z', '2026-11-21T06:00:00Z', 'now', satMorning)).toBe(true);
  });
});

describe('priceSummary', () => {
  it('describes free, paid and mixed events', () => {
    expect(priceSummary(true, 0)).toBe('Free');
    expect(priceSummary(false, null)).toBe('Free');
    expect(priceSummary(false, 29900)).toBe('From ₹299');
    expect(priceSummary(false, 0)).toBe('Free + paid');
  });
});

describe('stackBySpot', () => {
  it('numbers events at the same spot and fans them out', () => {
    const r = stackBySpot([
      { id: 'a', lat: 20.35, lng: 85.82 },
      { id: 'b', lat: 20.3, lng: 85.8 },
      { id: 'c', lat: 20.35, lng: 85.82 },
    ]);
    expect(r.map((p) => p.stack)).toEqual([0, 0, 1]);
    expect(stackOffsetPx(0)).toEqual([0, 0]);
    expect(stackOffsetPx(1)).toEqual([0, -30]);
  });
});
