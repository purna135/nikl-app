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
