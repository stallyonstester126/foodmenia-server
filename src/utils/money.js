/**
 * Currency Arithmetic & Conversion Utility (Integer Cents Engine)
 *
 * Ensures all monetary calculations are performed in integer cents/paisa
 * to avoid IEEE 754 floating point rounding drift across order totals,
 * voucher discounts, and Stripe charges.
 */

/**
 * Converts a decimal price (e.g. 19.99, "19.99", 480) to integer cents (1999).
 */
export function toCents(amount) {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return 0;
  return Math.round(Number(amount) * 100);
}

/**
 * Converts integer cents (1999) back to decimal currency number (19.99).
 */
export function fromCents(cents) {
  if (cents === null || cents === undefined || isNaN(Number(cents))) return 0.0;
  return Number((Math.round(Number(cents)) / 100).toFixed(2));
}

/**
 * Sums multiple integer cents values safely.
 */
export function addCents(...values) {
  return values.reduce((sum, v) => sum + (toCents(v) || 0), 0);
}

/**
 * Subtracts integer cents b from a, clamped at 0.
 */
export function subtractCents(a, b) {
  const diff = (toCents(a) || 0) - (toCents(b) || 0);
  return Math.max(0, diff);
}

/**
 * Multiplies integer cents by a scalar or ratio (e.g. percentage), returning integer cents.
 */
export function multiplyCents(cents, factor) {
  return Math.round(Number(cents || 0) * Number(factor));
}

/**
 * Calculates a percentage discount in integer cents from an integer cents subtotal.
 */
export function percentageDiscountCents(subtotalCents, percent) {
  const p = Number(percent) || 0;
  return Math.round((Number(subtotalCents || 0) * p) / 100);
}
