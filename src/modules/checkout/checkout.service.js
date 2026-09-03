import { CheckoutRepository } from "./checkout.repository.js";
import { CartService } from "../cart/cart.service.js";
import { VouchersService } from "../vouchers/vouchers.service.js";
import { HTTP_STATUS } from "../../config/constants.js";

export class CheckoutService {
  static async getPaymentMethods(userId) {
    let methods = await CheckoutRepository.getPaymentMethods(userId);
    if (methods.length === 0) {
      // Default COD payment method
      const defaultCOD = await CheckoutRepository.addPaymentMethod(userId, {
        type: "cod",
        provider: "Cash on Delivery",
        is_default: true,
      });
      methods = [defaultCOD];
    }
    return methods;
  }

  static async addPaymentMethod(userId, data) {
    return CheckoutRepository.addPaymentMethod(userId, data);
  }

  static async deletePaymentMethod(userId, methodId) {
    const existing = await CheckoutRepository.getPaymentMethodById(methodId, userId);
    if (!existing) {
      const error = new Error("Payment method not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }
    await CheckoutRepository.deletePaymentMethod(methodId, userId);
    return { message: "Payment method removed successfully." };
  }

  static async getCheckoutSummary(userId, voucherCode = null) {
    const cart = await CartService.getCart(userId);
    if (!cart.items || cart.items.length === 0) {
      const error = new Error("Cart is empty. Add items to cart before proceeding to checkout.");
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    let discountInfo = { voucher: null, discount_amount: 0.00 };
    if (voucherCode) {
      discountInfo = await VouchersService.validateAndCalculateDiscount(
        voucherCode,
        userId,
        cart.totals.subtotal,
        cart.totals.delivery_fee
      );
    }

    const subtotal = cart.totals.subtotal;
    const tax_rate = cart.totals.tax_rate ?? 0;
    const tax_amount = cart.totals.tax_amount ?? 0;
    const delivery_fee = cart.totals.delivery_fee;
    const platform_fee = cart.totals.platform_fee;
    const discount_amount = discountInfo.discount_amount;
    const total_before_discount = subtotal + tax_amount + delivery_fee + platform_fee;
    const finalTotal = Math.max(0, total_before_discount - discount_amount);

    let platformCurrency = "USD ($)";
    try {
      const { PlatformSettingsService } = await import("../../services/platformSettingsService.js");
      const settings = await PlatformSettingsService.getSettings();
      platformCurrency = settings.currency || "USD ($)";
    } catch {
      // Fallback
    }

    const activeCurrency = cart.restaurant?.currency || cart.totals?.currency || platformCurrency;

    return {
      restaurant: cart.restaurant,
      fulfillment_type: cart.fulfillment_type,
      items: cart.items,
      currency: activeCurrency,
      totals: {
        currency: activeCurrency,
        subtotal,
        tax_rate,
        tax_amount,
        tax: tax_amount,
        delivery_fee,
        platform_fee,
        total_before_discount: Number(total_before_discount.toFixed(2)),
        discount_amount,
        total: Number(finalTotal.toFixed(2)),
        item_count: cart.totals.item_count,
      },
      applied_voucher: discountInfo.voucher,
    };
  }

  static async applyVoucher(userId, voucherCode) {
    const summary = await this.getCheckoutSummary(userId, voucherCode);
    return {
      message: `Voucher "${voucherCode}" applied successfully!`,
      summary,
    };
  }
}
