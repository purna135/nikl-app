import { describe, expect, it } from 'vitest';
import {
  bookingFeePaise,
  cartTotals,
  formatEventWhen,
  formatIndianPhone,
  formatPaise,
  normalizeIndianPhone,
  slugify,
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
});

describe('slugify', () => {
  it('makes URL-safe slugs', () => {
    expect(slugify('Full Moon 10K: Night Run!')).toBe('full-moon-10k-night-run');
    expect(slugify('Pottery & Chai')).toBe('pottery-and-chai');
  });
});
