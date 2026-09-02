import { db } from "../../database/connection.js";

export class CheckoutRepository {
  static async getPaymentMethods(userId) {
    return db("payment_methods")
      .where({ user_id: userId })
      .orderBy("is_default", "desc")
      .orderBy("created_at", "desc");
  }

  static async getPaymentMethodById(id, userId) {
    return db("payment_methods").where({ id, user_id: userId }).first();
  }

  static async addPaymentMethod(userId, { type = "cod", provider = null, last4 = null, is_default = false }) {
    return db.transaction(async (trx) => {
      if (is_default) {
        await trx("payment_methods").where({ user_id: userId }).update({ is_default: false });
      }

      const [id] = await trx("payment_methods").insert({
        user_id: userId,
        type,
        provider,
        last4,
        is_default,
      });

      return trx("payment_methods").where({ id }).first();
    });
  }

  static async deletePaymentMethod(id, userId) {
    return db("payment_methods").where({ id, user_id: userId }).delete();
  }
}
