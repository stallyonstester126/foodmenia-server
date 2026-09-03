import { db } from "../database/connection.js";
import { fromCents, toCents } from "../utils/money.js";
import { env } from "../config/env.js";

export class PlatformSettingsService {
  static async getSettings() {
    let settings = await db("platform_settings").where({ id: 1 }).first();

    if (!settings) {
      await db("platform_settings").insert({
        id: 1,
        tax_rate_percent: 5.00,
        platform_fee_cents: env.FEES.PLATFORM_FEE_CENTS || 1999,
        default_delivery_fee_cents: env.FEES.DEFAULT_DELIVERY_FEE_CENTS || 4900,
        is_tax_enabled: true,
        currency: "Rs.",
      });
      settings = await db("platform_settings").where({ id: 1 }).first();
    }

    const platformFeeCents = Number(settings.platform_fee_cents ?? 1999);
    const defaultDeliveryFeeCents = Number(settings.default_delivery_fee_cents ?? 4900);

    return {
      id: settings.id,
      tax_rate_percent: Number(settings.tax_rate_percent ?? 5.0),
      platform_fee_cents: platformFeeCents,
      platform_fee: fromCents(platformFeeCents),
      default_delivery_fee_cents: defaultDeliveryFeeCents,
      default_delivery_fee: fromCents(defaultDeliveryFeeCents),
      is_tax_enabled: Boolean(settings.is_tax_enabled),
      currency: settings.currency || "Rs.",
      updated_at: settings.updated_at,
    };
  }

  static async updateSettings(data = {}, userId = null) {
    const current = await this.getSettings();

    const updatePayload = {
      updated_at: db.fn.now(),
    };

    if (userId) {
      updatePayload.updated_by = userId;
    }

    if (data.tax_rate_percent !== undefined) {
      updatePayload.tax_rate_percent = Math.max(0, Math.min(100, Number(data.tax_rate_percent)));
    }

    if (data.platform_fee !== undefined) {
      updatePayload.platform_fee_cents = toCents(data.platform_fee);
    } else if (data.platform_fee_cents !== undefined) {
      updatePayload.platform_fee_cents = Math.max(0, Number(data.platform_fee_cents));
    }

    if (data.default_delivery_fee !== undefined) {
      updatePayload.default_delivery_fee_cents = toCents(data.default_delivery_fee);
    } else if (data.default_delivery_fee_cents !== undefined) {
      updatePayload.default_delivery_fee_cents = Math.max(0, Number(data.default_delivery_fee_cents));
    }

    if (data.is_tax_enabled !== undefined) {
      updatePayload.is_tax_enabled = Boolean(data.is_tax_enabled);
    }

    if (data.currency !== undefined && typeof data.currency === "string") {
      updatePayload.currency = data.currency.trim();
    }

    await db("platform_settings").where({ id: 1 }).update(updatePayload);
    return this.getSettings();
  }
}
