/**
 * Money is always an integer number of paise (₹1 = 100 paise). Never use floats for money.
 */

/** Nikl's booking fee, in basis points (400 = 4%). Paid by the attendee on top of the ticket. */
export const BOOKING_FEE_BPS = 400;

/** ₹1,499 style, Indian digit grouping. 0 → "Free" unless `zeroAsFree` is false. */
export function formatPaise(paise: number, { zeroAsFree = true } = {}): string {
  if (!Number.isInteger(paise) || paise < 0) throw new RangeError(`Invalid paise amount: ${paise}`);
  if (paise === 0 && zeroAsFree) return 'Free';
  const rupees = paise / 100;
  const hasFraction = paise % 100 !== 0;
  return (
    '₹' +
    rupees.toLocaleString('en-IN', {
      minimumFractionDigits: hasFraction ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * Price summary for an event: "Free", "From ₹299", or "Free + paid" when a free tier sits beside paid ones.
 * `minPaise` is the cheapest tier (null when there are no tiers).
 */
export function priceSummary(isFree: boolean, minPaise: number | null | undefined): string {
  if (isFree || minPaise == null) return 'Free';
  if (minPaise === 0) return 'Free + paid';
  return `From ${formatPaise(minPaise)}`;
}

/** Booking fee for a subtotal, rounded to the nearest whole rupee (in paise). */
export function bookingFeePaise(subtotalPaise: number, feeBps: number = BOOKING_FEE_BPS): number {
  if (!Number.isInteger(subtotalPaise) || subtotalPaise < 0) throw new RangeError(`Invalid subtotal: ${subtotalPaise}`);
  if (subtotalPaise === 0) return 0;
  const raw = (subtotalPaise * feeBps) / 10_000;
  return Math.round(raw / 100) * 100;
}

export interface CartLine {
  unitPricePaise: number;
  qty: number;
}

export interface CartTotals {
  subtotalPaise: number;
  feePaise: number;
  totalPaise: number;
}

/** Totals for a ticket selection. The server recomputes this; the client only displays it. */
export function cartTotals(lines: CartLine[], feeBps: number = BOOKING_FEE_BPS): CartTotals {
  const subtotalPaise = lines.reduce((sum, l) => {
    if (!Number.isInteger(l.qty) || l.qty < 0) throw new RangeError(`Invalid qty: ${l.qty}`);
    return sum + l.unitPricePaise * l.qty;
  }, 0);
  const feePaise = bookingFeePaise(subtotalPaise, feeBps);
  return { subtotalPaise, feePaise, totalPaise: subtotalPaise + feePaise };
}
