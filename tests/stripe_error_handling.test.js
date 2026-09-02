import { describe, it, expect, jest } from "@jest/globals";
import { PaymentsService } from "../src/modules/payments/payments.service.js";
import { env } from "../src/config/env.js";

describe("Fix 0: Stripe Error Handling & Fallback Case Separation", () => {
  it("Case A: Should return mock response in dev environment when Stripe key is placeholder", async () => {
    // Force placeholder key mode
    const originalKey = env.STRIPE.SECRET_KEY;
    env.STRIPE.SECRET_KEY = "sk_test_placeholder_foodmenia_2026";

    const setupIntent = await PaymentsService.createSetupIntent(1);
    expect(setupIntent.client_secret).toContain("seti_secret_mock_");
    expect(setupIntent.setup_intent_id).toContain("seti_mock_");

    env.STRIPE.SECRET_KEY = originalKey;
  });

  it("Case B: Should propagate error when a real Stripe key is configured and Stripe API call fails", async () => {
    const originalKey = env.STRIPE.SECRET_KEY;
    // Set real non-placeholder key
    env.STRIPE.SECRET_KEY = "sk_test_real_live_key_999999";

    const stripeInstance = PaymentsService.getStripeInstance();
    const attachSpy = jest.spyOn(stripeInstance.paymentMethods, "attach").mockImplementation(async () => {
      throw new Error("Stripe API Connection Timeout / Card Rejected");
    });

    await expect(
      PaymentsService.savePaymentMethod(1, "pm_invalid_card", false)
    ).rejects.toThrow("Stripe API Connection Timeout / Card Rejected");

    attachSpy.mockRestore();
    env.STRIPE.SECRET_KEY = originalKey;
  });
});
