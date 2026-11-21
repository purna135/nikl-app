/**
 * Indian mobile numbers. We store and send them in E.164 form: +91XXXXXXXXXX.
 * Indian mobile numbers are 10 digits and start with 6, 7, 8 or 9.
 */

const INDIAN_MOBILE = /^[6-9]\d{9}$/;

/**
 * Accepts what people actually type ("98765 43210", "+91-98765-43210", "098765 43210")
 * and returns "+919876543210", or null if it isn't a valid Indian mobile number.
 */
export function normalizeIndianPhone(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return INDIAN_MOBILE.test(digits) ? `+91${digits}` : null;
}

/** "+919876543210" → "+91 98765 43210" for display. */
export function formatIndianPhone(e164: string): string {
  const m = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return m ? `+91 ${m[1]} ${m[2]}` : e164;
}
