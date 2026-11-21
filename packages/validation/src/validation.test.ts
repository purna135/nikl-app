import { describe, expect, it } from 'vitest';
import {
  clubFormSchema,
  eventDraftSchema,
  eventFormSchema,
  otpSchema,
  phoneSchema,
  profileSetupSchema,
  usernameSchema,
} from './index';

describe('clubFormSchema', () => {
  it('accepts a club and lowercases the handle', () => {
    const r = clubFormSchema.parse({ name: 'Patia Pacers', handle: 'Patia.Pacers', category: 'fitness', area: 'Patia' });
    expect(r.handle).toBe('patia.pacers');
  });
  it('rejects handles with spaces and unknown categories', () => {
    expect(clubFormSchema.safeParse({ name: 'X Club', handle: 'x club', category: 'fitness' }).success).toBe(false);
    expect(clubFormSchema.safeParse({ name: 'X Club', handle: 'x.club', category: 'karaoke' }).success).toBe(false);
  });
});

describe('eventFormSchema', () => {
  const base = {
    clubId: '3f1c2a52-5d0e-4c9b-8f1e-2b7a9d6c4e10',
    title: 'Sunday Long Run',
    category: 'fitness',
    startsAt: '2026-11-29T05:45:00+05:30',
    venueName: 'Infocity Square',
  };
  it('defaults to a single free, unpublished date', () => {
    const r = eventFormSchema.parse(base);
    expect(r).toMatchObject({ repeatWeeks: 1, tiers: [], publish: false });
  });
  it('checks the end is after the start', () => {
    const r = eventFormSchema.safeParse({ ...base, endsAt: '2026-11-29T05:00:00+05:30' });
    expect(r.success).toBe(false);
  });
  it('requires paid tiers to cost at least ₹1 and allows up to 6', () => {
    expect(eventFormSchema.safeParse({ ...base, tiers: [{ name: 'Regular', pricePaise: 50 }] }).success).toBe(false);
    const seven = Array.from({ length: 7 }, (_, i) => ({ name: `T${i}`, pricePaise: 10000 }));
    expect(eventFormSchema.safeParse({ ...base, tiers: seven }).success).toBe(false);
  });
});

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
