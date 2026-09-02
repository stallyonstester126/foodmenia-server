import { db } from "../../database/connection.js";

export class UsersRepository {
  static async findById(id) {
    const user = await db("users")
      .where({ id })
      .select("id", "name", "email", "phone", "avatar_url", "email_verified", "role", "created_at", "updated_at")
      .first();

    if (!user) return null;

    const restaurant = await db("restaurants").where({ owner_id: id }).first();

    return {
      ...user,
      role: user.role || "customer",
      hasRestaurant: Boolean(restaurant),
    };
  }

  static async findByEmail(email) {
    return db("users").where({ email: email.toLowerCase() }).first();
  }

  static async updateProfile(id, updateData) {
    await db("users")
      .where({ id })
      .update({
        ...updateData,
        updated_at: db.fn.now(),
      });
    return this.findById(id);
  }

  // Address queries
  static async getAddressesByUserId(userId) {
    return db("addresses")
      .where({ user_id: userId })
      .orderBy("is_default", "desc")
      .orderBy("created_at", "desc");
  }

  static async getAddressById(addressId, userId) {
    return db("addresses")
      .where({ id: addressId, user_id: userId })
      .first();
  }

  static async createAddress(addressData, trx = null) {
    const query = trx ? trx("addresses") : db("addresses");
    const [id] = await query.insert(addressData);
    return (trx ? trx("addresses") : db("addresses"))
      .where({ id, user_id: addressData.user_id })
      .first();
  }

  static async updateAddress(addressId, userId, updateData, trx = null) {
    const query = trx ? trx("addresses") : db("addresses");
    await query.where({ id: addressId, user_id: userId }).update(updateData);
    return (trx ? trx("addresses") : db("addresses"))
      .where({ id: addressId, user_id: userId })
      .first();
  }

  static async deleteAddress(addressId, userId) {
    return db("addresses").where({ id: addressId, user_id: userId }).delete();
  }

  static async clearDefaultAddresses(userId, trx = null) {
    const query = trx ? trx("addresses") : db("addresses");
    return query.where({ user_id: userId }).update({ is_default: false });
  }
}
