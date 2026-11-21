import { z } from 'zod';
import { BBSR_AREAS, CATEGORY_IDS, normalizeIndianPhone } from '@nikl/utils';

/** Indian mobile number in any common format → "+91XXXXXXXXXX". */
export const phoneSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const e164 = normalizeIndianPhone(value);
    if (!e164) {
      ctx.addIssue({ code: 'custom', message: 'Enter a 10-digit Indian mobile number.' });
      return z.NEVER;
    }
    return e164;
  });

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code from the SMS.');

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._]{3,24}$/, 'Use 3–24 letters, numbers, dots or underscores.')
  .refine((u) => !u.startsWith('.') && !u.endsWith('.') && !u.includes('..'), 'Dots can’t be at the start, the end or next to each other.');

const currentYear = new Date().getFullYear();

/** Profile set-up after the first login. Accounts are 18+ at launch (DEV_PLAN §8). */
export const profileSetupSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(60),
  username: usernameSchema,
  area: z.enum(BBSR_AREAS),
  interests: z.array(z.enum(CATEGORY_IDS)).min(3, 'Pick at least 3 things you’re into.').max(12),
  dobYear: z
    .number()
    .int()
    .min(currentYear - 100)
    .max(currentYear - 18, 'You need to be 18 or older to use Nikl.'),
});
export type ProfileSetup = z.infer<typeof profileSetupSchema>;

/** Club page handle, e.g. "patia.pacers". Same rule as the database. */
export const clubHandleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._]{3,30}$/, 'Use 3–30 letters, numbers, dots or underscores (no spaces).');

/** "Create your club page" form. New pages wait for Nikl approval (DECISIONS.md P15). */
export const clubFormSchema = z.object({
  name: z.string().trim().min(2, 'Enter your club or organizer name.').max(80),
  handle: clubHandleSchema,
  category: z.enum(CATEGORY_IDS, { error: 'Pick a category.' }),
  kind: z.string().trim().max(40).optional(),
  area: z.enum(BBSR_AREAS).optional(),
  bio: z.string().trim().max(500, 'Keep the bio under 500 characters.').optional(),
});
export type ClubForm = z.infer<typeof clubFormSchema>;

export const ticketTierSchema = z.object({
  name: z.string().trim().min(1, 'Name every ticket type.').max(40),
  /** Integer paise. Paid tiers start at ₹1. */
  pricePaise: z.number().int().min(100, 'Paid tickets cost at least ₹1.').max(10_000_000),
  quantity: z.number().int().positive().max(100_000).optional(),
});
export type TicketTierInput = z.infer<typeof ticketTierSchema>;

/**
 * Organizer "new event" form. Times carry an explicit +05:30 offset (IST).
 * No tiers = a free RSVP event.
 */
export const eventFormSchema = z
  .object({
    clubId: z.uuid(),
    title: z.string().trim().min(3, 'Give the event a name (at least 3 characters).').max(120),
    category: z.enum(CATEGORY_IDS, { error: 'Pick a category.' }),
    description: z.string().trim().max(5000).optional(),
    posterUrl: z.url().optional(),
    startsAt: z.iso.datetime({ offset: true, error: 'Pick a date and start time.' }),
    endsAt: z.iso.datetime({ offset: true }).optional(),
    venueName: z.string().trim().min(2, 'Add where it happens.').max(120),
    venueAddress: z.string().trim().max(200).optional(),
    venueArea: z.enum(BBSR_AREAS).optional(),
    /** Map pin. Both or neither; must be inside India (same check as the database). */
    venueLat: z.number().min(6, 'The map pin has to be in India.').max(37, 'The map pin has to be in India.').optional(),
    venueLng: z.number().min(68, 'The map pin has to be in India.').max(98, 'The map pin has to be in India.').optional(),
    capacity: z.number().int().positive().max(100_000).optional(),
    repeatWeeks: z.number().int().min(1).max(12).default(1),
    tiers: z.array(ticketTierSchema).max(6, 'Add up to 6 ticket types.').default([]),
    publish: z.boolean().default(false),
  })
  .refine((v) => !v.endsAt || new Date(v.endsAt) > new Date(v.startsAt), {
    message: 'The end time has to be after the start time.',
    path: ['endsAt'],
  })
  .refine((v) => (v.venueLat === undefined) === (v.venueLng === undefined), {
    message: 'Drop the map pin again.',
    path: ['venueLat'],
  });
export type EventForm = z.infer<typeof eventFormSchema>;

/** Organizer event draft (week 2). Prices are integer paise; 0 = free RSVP. */
export const eventDraftSchema = z.object({
  title: z.string().trim().min(3, 'Give the event a name.').max(90),
  category: z.enum(CATEGORY_IDS),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }).optional(),
  venueName: z.string().trim().min(2, 'Add a venue.').max(120),
  pricePaise: z.number().int().min(0).max(10_000_000),
  capacity: z.number().int().positive().max(100_000).optional(),
  repeatsWeekly: z.boolean().default(false),
});
export type EventDraft = z.infer<typeof eventDraftSchema>;
