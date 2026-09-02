import { VouchersRepository } from "./vouchers.repository.js";
import { HTTP_STATUS } from "../../config/constants.js";

export class VouchersService {
  static async validateAndCalculateDiscount(code, userId, subtotal, deliveryFee, trx = null) {
    if (!code) return { voucher: null, discount_amount: 0.00 };

    const voucher = await VouchersRepository.findByCode(code);
    if (!voucher) {
      const error = new Error("Invalid voucher code.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    if (!voucher.is_active) {
      const error = new Error("This voucher is no longer active.");
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    const now = new Date();
    if (voucher.valid_from && new Date(voucher.valid_from) > now) {
      const error = new Error("This voucher is not yet valid.");
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    if (voucher.valid_until && new Date(voucher.valid_until) < now) {
      const error = new Error("This voucher has expired.");
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    if (voucher.usage_limit <= 0) {
      const error = new Error("This voucher has reached its maximum total usage limit.");
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    if (Number(subtotal) < Number(voucher.min_order_amount)) {
      const error = new Error(`Minimum order amount of Rs. ${voucher.min_order_amount} required for this voucher.`);
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    const userRedemptions = await VouchersRepository.getUserRedemptionCount(voucher.id, userId, trx);
    if (userRedemptions >= voucher.per_user_limit) {
      const error = new Error("You have already used this voucher the maximum number of times.");
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    // Calculate discount amount
    let discount = 0.00;
    if (voucher.discount_type === "percent") {
      discount = (Number(subtotal) * Number(voucher.discount_value)) / 100;
      if (voucher.max_discount_amount && discount > Number(voucher.max_discount_amount)) {
        discount = Number(voucher.max_discount_amount);
      }
    } else if (voucher.discount_type === "flat") {
      discount = Math.min(Number(voucher.discount_value), Number(subtotal));
    } else if (voucher.discount_type === "free_delivery") {
      discount = Number(deliveryFee);
    }

    discount = Number(discount.toFixed(2));

    return {
      voucher: {
        id: voucher.id,
        code: voucher.code,
        discount_type: voucher.discount_type,
        discount_value: voucher.discount_value,
      },
      discount_amount: discount,
    };
  }

  static async getAvailableVouchers(userId) {
    return VouchersRepository.getAvailableVouchersForUser(userId);
  }
}
