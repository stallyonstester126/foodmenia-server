import { describe, it, expect } from "@jest/globals";
import { toCents, fromCents, addCents, subtractCents, percentageDiscountCents } from "../src/utils/money.js";
import { calculateCartTotals } from "../src/modules/cart/pricing.js";
import { PaymentsService } from "../src/modules/payments/payments.service.js";
import { env } from "../src/config/env.js";

describe("Money Integrity & Pricing Engine Unit Tests", () => {
  it("should convert decimal prices to integer cents accurately without IEEE 754 float drift", () => {
    expect(toCents(19.99)).toBe(1999);
    expect(toCents("19.99")).toBe(1999);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(fromCents(1999)).toBe(19.99);
  });

  it("should calculate percentage discount in integer cents without float precision error", () => {
    // 15% discount on Rs. 349.99 = 52.4985 -> 52.50 (5250 cents)
    const subtotalCents = toCents(349.99);
    const discountCents = percentageDiscountCents(subtotalCents, 15);
    expect(discountCents).toBe(5250);
    expect(fromCents(discountCents)).toBe(52.50);
  });

  it("should respect environment config-driven platform and delivery fees", () => {
    const items = [{ unit_price_snapshot: 100.00, quantity: 1 }];
    const totals = calculateCartTotals(items, "delivery");

    expect(totals.platformFeeCents).toBe(env.FEES.PLATFORM_FEE_CENTS);
    expect(totals.deliveryFeeCents).toBe(env.FEES.DEFAULT_DELIVERY_FEE_CENTS);
    expect(totals.grandTotalCents).toBe(10000 + env.FEES.DEFAULT_DELIVERY_FEE_CENTS + env.FEES.PLATFORM_FEE_CENTS);
  });

  it("should trigger Money Integrity Assertion when Stripe expected cents does not match computed total", async () => {
    const mockOrderPayload = { id: 999, total: 50.00, user_id: 1 };
    const mockPaymentMethod = { type: "card", provider: "stripe", provider_payment_method_id: "pm_mock" };

    // Pass expectedAmountInCents = 6000 (Rs. 60.00) while order.total is 50.00 (5000 cents)
    await expect(
      PaymentsService.processOrderPayment(
        mockOrderPayload,
        mockPaymentMethod,
        "cus_mock",
        null,
        6000
      )
    ).rejects.toThrow("Something went wrong with payment calculation. Please try again.");
  });

  it("should succeed when Money Integrity Assertion expected cents matches computed total exactly", async () => {
    const mockOrderPayload = { id: 999, total: 50.00, user_id: 1 };
    const mockPaymentMethod = { type: "card", provider: "stripe", provider_payment_method_id: "pm_mock" };

    const result = await PaymentsService.processOrderPayment(
      mockOrderPayload,
      mockPaymentMethod,
      "cus_mock",
      null,
      5000
    );

    expect(result.status).toBe("succeeded");
    expect(result.payment_intent_id).toBeDefined();
  });
});
