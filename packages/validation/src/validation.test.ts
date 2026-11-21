import { describe, expect, it } from 'vitest';
import { eventDraftSchema, otpSchema, phoneSchema, profileSetupSchema, usernameSchema } from './index';

describe('phoneSchema', () => {
  it('normalizes valid numbers', () => {
    expect(phoneSchema.parse(' 98765 43210 ')).toBe('+919876543210');
  });
  it('gives a friendly error for invalid numbers', () => {
    const r = phoneSchema.safeParse('12345');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toMatch(/10-digit/);
  });
});

describe('otpSchema', () => {
  it('accepts exactly 6 digits', () => {
    expect(otpSchema.safeParse('123456').success).toBe(true);
    expect(otpSchema.safeParse('12345').success).toBe(false);
    expect(otpSchema.safeParse('12a456').success).toBe(false);
  });
});

describe('usernameSchema', () => {
  it('lowercases and checks the format', () => {
    expect(usernameSchema.parse('Riya.Nikls')).toBe('riya.nikls');
    expect(usernameSchema.safeParse('.riya').success).toBe(false);
    expect(usernameSchema.safeParse('ri').success).toBe(false);
  });
});

describe('profileSetupSchema', () => {
  const base = { name: 'Riya Mohanty', username: 'riya.nikls', area: 'Patia', interests: ['fitness', 'comedy', 'games'], dobYear: 2001 };
  it('accepts a complete profile', () => {
    expect(profileSetupSchema.safeParse(base).success).toBe(true);
  });
  it('requires 3 interests and 18+', () => {
    expect(profileSetupSchema.safeParse({ ...base, interests: ['fitness'] }).success).toBe(false);
    expect(profileSetupSchema.safeParse({ ...base, dobYear: new Date().getFullYear() - 16 }).success).toBe(false);
  });
});

describe('eventDraftSchema', () => {
  it('accepts a free event and rejects fractional paise', () => {
    const draft = { title: 'Sunday Long Run', category: 'fitness', startsAt: '2026-11-29T05:45:00+05:30', venueName: 'Infocity Square', pricePaise: 0 };
    expect(eventDraftSchema.safeParse(draft).success).toBe(true);
    expect(eventDraftSchema.safeParse({ ...draft, pricePaise: 199.5 }).success).toBe(false);
  });
});
