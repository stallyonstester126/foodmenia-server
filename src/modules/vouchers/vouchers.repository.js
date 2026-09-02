import { db } from "../../database/connection.js";

export class VouchersRepository {
  static async findByCode(code) {
    return db("vouchers").where({ code: code.toUpperCase().trim() }).first();
  }

  static async findById(id) {
    return db("vouchers").where({ id }).first();
  }

  static async getUserRedemptionCount(voucherId, userId, trx = null) {
    const query = trx ? trx("voucher_redemptions") : db("voucher_redemptions");
    const result = await query
      .where({ voucher_id: voucherId, user_id: userId })
      .count("id as count");
    return Number(result[0]?.count || 0);
  }

  static async recordRedemption(voucherId, userId, orderId, trx = null) {
    const query = trx ? trx("voucher_redemptions") : db("voucher_redemptions");
    await query.insert({
      voucher_id: voucherId,
      user_id: userId,
      order_id: orderId,
    });

    // Decrement usage_limit
    const vQuery = trx ? trx("vouchers") : db("vouchers");
    await vQuery.where({ id: voucherId }).decrement("usage_limit", 1);
  }

  static async getAvailableVouchersForUser(userId) {
    const now = new Date();
    const vouchers = await db("vouchers")
      .where("is_active", true)
      .andWhere("valid_from", "<=", now)
      .andWhere((builder) => {
        builder.whereNull("valid_until").orWhere("valid_until", ">=", now);
      })
      .andWhere("usage_limit", ">", 0)
      .andWhereRaw(
        `(SELECT COUNT(*) FROM voucher_redemptions WHERE voucher_redemptions.voucher_id = vouchers.id AND voucher_redemptions.user_id = ?) < vouchers.per_user_limit`,
        [userId]
      )
      .select(
        "id",
        "code",
        "discount_type",
        "discount_value",
        "min_order_amount",
        "max_discount_amount",
        "valid_until"
      );

    return vouchers.map((v) => ({
      id: v.id,
      code: v.code,
      discountType: v.discount_type,
      discountValue: Number(v.discount_value),
      minOrderAmount: Number(v.min_order_amount),
      maxDiscountAmount: v.max_discount_amount != null ? Number(v.max_discount_amount) : null,
      validUntil: v.valid_until,
    }));
  }
}
