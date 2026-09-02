import { toCents, fromCents, percentageDiscountCents } from "../../utils/money.js";
import { env } from "../../config/env.js";

/**
 * Centralized Cart & Order Total Pricing Engine
 *
 * All financial calculations use integer cents to guarantee 100% precision.
 */
export function calculateCartTotals(cartItems = [], fulfillmentType = "delivery", voucher = null, deliveryFeeOverride = null) {
  // 1. Calculate items subtotal in integer cents
  let subtotalCents = 0;

  for (const item of cartItems) {
    const unitPriceCents = toCents(item.unit_price_snapshot ?? item.base_price ?? item.price ?? 0);
    const addons = Array.isArray(item.addons) ? item.addons : (Array.isArray(item.selectedOptions) ? item.selectedOptions : []);
    const addonsTotalCents = addons.reduce((sum, a) => sum + toCents(a.price_snapshot ?? a.extra_price ?? a.price ?? 0), 0);

    const qty = Number(item.quantity || 1);
    const itemTotalCents = (unitPriceCents + addonsTotalCents) * qty;

    item.unit_price_cents = unitPriceCents;
    item.addons_total_cents = addonsTotalCents;
    item.item_total_cents = itemTotalCents;
    item.item_total = fromCents(itemTotalCents);

    subtotalCents += itemTotalCents;
  }

  // 2. Delivery & Platform Fees in Cents
  const defaultDeliveryCents = deliveryFeeOverride !== null && deliveryFeeOverride !== undefined
    ? toCents(deliveryFeeOverride)
    : env.FEES.DEFAULT_DELIVERY_FEE_CENTS;

  const deliveryFeeCents = fulfillmentType === "pickup" ? 0 : defaultDeliveryCents;
  const platformFeeCents = env.FEES.PLATFORM_FEE_CENTS;

  // 3. Voucher Discount in Cents
  let discountCents = 0;
  let voucherObj = null;

  if (voucher) {
    const minOrderCents = toCents(voucher.min_order_amount || 0);

    if (subtotalCents >= minOrderCents) {
      if (voucher.discount_type === "percent") {
        discountCents = percentageDiscountCents(subtotalCents, voucher.discount_value);
        if (voucher.max_discount_amount) {
          const maxDiscountCents = toCents(voucher.max_discount_amount);
          if (discountCents > maxDiscountCents) {
            discountCents = maxDiscountCents;
          }
        }
      } else if (voucher.discount_type === "flat") {
        discountCents = Math.min(toCents(voucher.discount_value), subtotalCents);
      } else if (voucher.discount_type === "free_delivery") {
        discountCents = deliveryFeeCents;
      }
    }

    voucherObj = {
      id: voucher.id,
      code: voucher.code,
      discount_type: voucher.discount_type,
      discount_value: voucher.discount_value,
    };
  }

  // 4. Final Total in Cents
  const preDiscountTotalCents = subtotalCents + deliveryFeeCents + platformFeeCents;
  const grandTotalCents = Math.max(0, preDiscountTotalCents - discountCents);

  return {
    subtotalCents,
    deliveryFeeCents,
    platformFeeCents,
    discountCents,
    grandTotalCents,

    // Decimal outputs for API responses / DB persistence
    subtotal: fromCents(subtotalCents),
    delivery_fee: fromCents(deliveryFeeCents),
    platform_fee: fromCents(platformFeeCents),
    discount_amount: fromCents(discountCents),
    total: fromCents(grandTotalCents),
    item_count: cartItems.reduce((acc, item) => acc + Number(item.quantity || 1), 0),
    voucher: voucherObj,
  };
}
