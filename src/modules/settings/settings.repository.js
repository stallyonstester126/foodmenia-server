import { db } from "../../database/connection.js";

export class SettingsRepository {
  static async getByUserId(userId) {
    return db("user_settings").where({ user_id: userId }).first();
  }

  static async updateByUserId(userId, updateData) {
    const existing = await this.getByUserId(userId);
    if (existing) {
      await db("user_settings")
        .where({ user_id: userId })
        .update({
          ...updateData,
          updated_at: db.fn.now(),
        });
    } else {
      await db("user_settings").insert({
        user_id: userId,
        language: updateData.language || "English",
        push_notifications: updateData.push_notifications ?? true,
        email_offers: updateData.email_offers ?? true,
        show_tracking_cost: updateData.show_tracking_cost ?? true,
      });
    }
    return this.getByUserId(userId);
  }
}
