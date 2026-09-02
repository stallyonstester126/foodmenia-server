import { db } from "../../database/connection.js";
import { HTTP_STATUS } from "../../config/constants.js";
import { PaymentsService } from "../payments/payments.service.js";
import { RiderRepository } from "../rider/rider.repository.js";

export class AdminService {
  static async verifyRestaurantOwnership(restaurantId, user) {
    if (user.role === "admin") return true;

    const restaurant = await db("restaurants").where({ id: restaurantId }).first();
    if (!restaurant) {
      const error = new Error("Restaurant not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    if (restaurant.owner_id !== user.id) {
      const error = new Error("Forbidden: You do not own this restaurant.");
      error.statusCode = HTTP_STATUS.FORBIDDEN;
      throw error;
    }

    return true;
  }

  // --- 1. Restaurants Management ---
  static async listRestaurants({ search, status, type, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    let query = db("restaurants as r")
      .leftJoin("users as u", "r.owner_id", "u.id")
      .select(
        "r.id",
        "r.name",
        "r.type",
        "r.description",
        "r.cover_image_url",
        "r.address",
        "r.price_tier",
        "r.rating",
        "r.is_active",
        "r.created_at",
        "u.id as owner_id",
        "u.name as owner_name",
        "u.email as owner_email",
        "u.phone as owner_phone"
      )
      .orderBy("r.id", "desc");

    if (search) {
      query = query.where((b) =>
        b.whereILike("r.name", `%${search}%`).orWhereILike("r.description", `%${search}%`)
      );
    }

    if (status === "active") {
      query = query.andWhere("r.is_active", true);
    } else if (status === "inactive" || status === "pending") {
      query = query.andWhere("r.is_active", false);
    }

    if (type) {
      query = query.andWhere("r.type", type);
    }

    const items = await query.limit(limit).offset(offset);

    for (const item of items) {
      item.is_active = Boolean(item.is_active);
      item.cuisines = await db("restaurant_cuisines as rc")
        .join("cuisines as c", "rc.cuisine_id", "c.id")
        .where("rc.restaurant_id", item.id)
        .select("c.id", "c.name");
    }

    return items;
  }

  static async getRestaurantDetails(restaurantId) {
    const restaurant = await db("restaurants as r")
      .leftJoin("users as u", "r.owner_id", "u.id")
      .where("r.id", restaurantId)
      .select(
        "r.id",
        "r.name",
        "r.description",
        "r.cover_image_url",
        "r.address",
        "r.price_tier",
        "r.rating",
        "r.is_active",
        "r.created_at",
        "u.id as owner_id",
        "u.name as owner_name",
        "u.email as owner_email",
        "u.phone as owner_phone"
      )
      .first();

    if (!restaurant) {
      const error = new Error("Restaurant not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    restaurant.is_active = Boolean(restaurant.is_active);

    restaurant.cuisines = await db("restaurant_cuisines as rc")
      .join("cuisines as c", "rc.cuisine_id", "c.id")
      .where("rc.restaurant_id", restaurantId)
      .select("c.id", "c.name");

    restaurant.categories = await db("menu_categories")
      .where({ restaurant_id: restaurantId })
      .orderBy("sort_order", "asc");

    restaurant.menu_items = await db("menu_items")
      .where({ restaurant_id: restaurantId })
      .orderBy("sort_order", "asc");

    return restaurant;
  }
  static async createRestaurant(user, data) {
    const ownerId = user.role === "restaurant_owner" ? user.id : (data.owner_id || user.id);

    const [id] = await db("restaurants").insert({
      name: data.name,
      cover_image_url: data.cover_image_url || null,
      description: data.description || null,
      address: data.address || null,
      lat: data.lat || null,
      lng: data.lng || null,
      price_tier: data.price_tier || "$$",
      delivery_time_min: data.delivery_time_min || 20,
      delivery_time_max: data.delivery_time_max || 35,
      is_active: data.is_active ?? true,
      owner_id: ownerId,
    });

    if (data.cuisine_ids && data.cuisine_ids.length > 0) {
      const links = data.cuisine_ids.map((cid) => ({
        restaurant_id: id,
        cuisine_id: cid,
      }));
      await db("restaurant_cuisines").insert(links);
    }

    return db("restaurants").where({ id }).first();
  }

  static async updateRestaurant(restaurantId, user, data) {
    await this.verifyRestaurantOwnership(restaurantId, user);

    const updatePayload = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.cover_image_url !== undefined) updatePayload.cover_image_url = data.cover_image_url;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.address !== undefined) updatePayload.address = data.address;
    if (data.price_tier !== undefined) updatePayload.price_tier = data.price_tier;
    if (data.delivery_time_min !== undefined) updatePayload.delivery_time_min = data.delivery_time_min;
    if (data.delivery_time_max !== undefined) updatePayload.delivery_time_max = data.delivery_time_max;
    if (data.is_active !== undefined) updatePayload.is_active = data.is_active;

    await db("restaurants").where({ id: restaurantId }).update(updatePayload);
    return db("restaurants").where({ id: restaurantId }).first();
  }

  static async toggleRestaurantActive(restaurantId, user) {
    await this.verifyRestaurantOwnership(restaurantId, user);
    const restaurant = await db("restaurants").where({ id: restaurantId }).first();
    const newStatus = !restaurant.is_active;
    await db("restaurants").where({ id: restaurantId }).update({ is_active: newStatus });
    return { id: restaurantId, is_active: newStatus };
  }

  static async deleteRestaurant(restaurantId, user) {
    await this.verifyRestaurantOwnership(restaurantId, user);
    await db("restaurants").where({ id: restaurantId }).delete();
    return { message: "Restaurant deleted successfully." };
  }

  // --- 2. Menu Categories & Items ---
  static async createCategory(restaurantId, user, name, sortOrder = 0) {
    await this.verifyRestaurantOwnership(restaurantId, user);
    const [id] = await db("menu_categories").insert({
      restaurant_id: restaurantId,
      name,
      sort_order: sortOrder,
    });
    return db("menu_categories").where({ id }).first();
  }

  static async createMenuItem(restaurantId, user, itemData) {
    await this.verifyRestaurantOwnership(restaurantId, user);

    const [id] = await db("menu_items").insert({
      restaurant_id: restaurantId,
      category_id: itemData.category_id,
      name: itemData.name,
      description: itemData.description || null,
      image_url: itemData.image_url || null,
      base_price: itemData.base_price,
      is_available: itemData.is_available ?? true,
      sort_order: itemData.sort_order || 0,
    });

    return db("menu_items").where({ id }).first();
  }

  static async updateMenuItem(itemId, user, updateData) {
    const item = await db("menu_items").where({ id: itemId }).first();
    if (!item) {
      const error = new Error("Menu item not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }
    await this.verifyRestaurantOwnership(item.restaurant_id, user);

    await db("menu_items").where({ id: itemId }).update(updateData);
    return db("menu_items").where({ id: itemId }).first();
  }

  static async deleteMenuItem(itemId, user) {
    const item = await db("menu_items").where({ id: itemId }).first();
    if (!item) {
      const error = new Error("Menu item not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }
    await this.verifyRestaurantOwnership(item.restaurant_id, user);
    await db("menu_items").where({ id: itemId }).delete();
    return { message: "Menu item deleted successfully." };
  }

  // --- 3. Vouchers Management ---
  static async listVouchers({ status, search, page = 1, limit = 50 }) {
    const offset = (page - 1) * limit;

    let query = db("vouchers as v")
      .leftJoin("voucher_redemptions as vr", "v.id", "vr.voucher_id")
      .select(
        "v.*",
        db.raw("COUNT(vr.id) as redeemed_count")
      )
      .groupBy("v.id")
      .orderBy("v.created_at", "desc");

    if (search) {
      const q = `%${search.toUpperCase().trim()}%`;
      query = query.where("v.code", "like", q);
    }

    if (status === "active") {
      query = query.where("v.is_active", true);
    } else if (status === "inactive") {
      query = query.where("v.is_active", false);
    }

    const vouchers = await query.limit(limit).offset(offset);

    return vouchers.map((v) => ({
      ...v,
      is_active: Boolean(v.is_active),
      redeemed_count: Number(v.redeemed_count || 0),
      discount_value: Number(v.discount_value || 0),
      min_order_amount: Number(v.min_order_amount || 0),
      max_discount_amount: v.max_discount_amount !== null ? Number(v.max_discount_amount) : null,
      is_expired: v.valid_until ? new Date(v.valid_until) < new Date() : false,
      is_exhausted: v.usage_limit ? Number(v.redeemed_count || 0) >= Number(v.usage_limit) : false,
    }));
  }

  static async createVoucher(data) {
    const formattedCode = data.code.toUpperCase().trim();

    const existing = await db("vouchers").where({ code: formattedCode }).first();
    if (existing) {
      const error = new Error(`Voucher code '${formattedCode}' already exists.`);
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    const [id] = await db("vouchers").insert({
      code: formattedCode,
      discount_type: data.discount_type,
      discount_value: Number(data.discount_value || 0),
      min_order_amount: Number(data.min_order_amount || 0),
      max_discount_amount: data.max_discount_amount ? Number(data.max_discount_amount) : null,
      valid_from: data.valid_from ? new Date(data.valid_from) : db.fn.now(),
      valid_until: data.valid_until ? new Date(data.valid_until) : null,
      usage_limit: Number(data.usage_limit || 1000),
      per_user_limit: Number(data.per_user_limit || 1),
      is_active: data.is_active ?? true,
    });

    const voucher = await db("vouchers").where({ id }).first();
    return {
      ...voucher,
      redeemed_count: 0,
    };
  }

  static async updateVoucher(voucherId, data) {
    const existing = await db("vouchers").where({ id: voucherId }).first();
    if (!existing) {
      const error = new Error("Voucher not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    const updatePayload = {};
    if (data.code !== undefined) {
      const formattedCode = data.code.toUpperCase().trim();
      if (formattedCode !== existing.code) {
        const codeTaken = await db("vouchers").where({ code: formattedCode }).whereNot({ id: voucherId }).first();
        if (codeTaken) {
          const error = new Error(`Voucher code '${formattedCode}' is already taken by another voucher.`);
          error.statusCode = HTTP_STATUS.BAD_REQUEST;
          throw error;
        }
      }
      updatePayload.code = formattedCode;
    }

    if (data.discount_type !== undefined) updatePayload.discount_type = data.discount_type;
    if (data.discount_value !== undefined) updatePayload.discount_value = Number(data.discount_value);
    if (data.min_order_amount !== undefined) updatePayload.min_order_amount = Number(data.min_order_amount);
    if (data.max_discount_amount !== undefined) updatePayload.max_discount_amount = data.max_discount_amount ? Number(data.max_discount_amount) : null;
    if (data.valid_from !== undefined) updatePayload.valid_from = data.valid_from ? new Date(data.valid_from) : null;
    if (data.valid_until !== undefined) updatePayload.valid_until = data.valid_until ? new Date(data.valid_until) : null;
    if (data.usage_limit !== undefined) updatePayload.usage_limit = Number(data.usage_limit);
    if (data.per_user_limit !== undefined) updatePayload.per_user_limit = Number(data.per_user_limit);
    if (data.is_active !== undefined) updatePayload.is_active = Boolean(data.is_active);

    await db("vouchers").where({ id: voucherId }).update(updatePayload);

    const updated = await db("vouchers as v")
      .leftJoin("voucher_redemptions as vr", "v.id", "vr.voucher_id")
      .where("v.id", voucherId)
      .select("v.*", db.raw("COUNT(vr.id) as redeemed_count"))
      .groupBy("v.id")
      .first();

    return {
      ...updated,
      redeemed_count: Number(updated?.redeemed_count || 0),
    };
  }

  static async toggleVoucherActive(voucherId) {
    const voucher = await db("vouchers").where({ id: voucherId }).first();
    if (!voucher) {
      const error = new Error("Voucher not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    await db("vouchers").where({ id: voucherId }).update({ is_active: !voucher.is_active });

    const updated = await db("vouchers as v")
      .leftJoin("voucher_redemptions as vr", "v.id", "vr.voucher_id")
      .where("v.id", voucherId)
      .select("v.*", db.raw("COUNT(vr.id) as redeemed_count"))
      .groupBy("v.id")
      .first();

    return {
      ...updated,
      is_active: Boolean(updated.is_active),
      redeemed_count: Number(updated?.redeemed_count || 0),
    };
  }

  static async deleteVoucher(voucherId) {
    const voucher = await db("vouchers").where({ id: voucherId }).first();
    if (!voucher) {
      const error = new Error("Voucher not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    const [{ count }] = await db("voucher_redemptions").where({ voucher_id: voucherId }).count("* as count");
    if (Number(count) > 0) {
      const error = new Error("Cannot delete a voucher that has already been redeemed. Deactivate it instead.");
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    await db("vouchers").where({ id: voucherId }).delete();
    return { message: "Voucher deleted successfully." };
  }

  static async getVoucherRedemptions(voucherId) {
    const voucher = await db("vouchers").where({ id: voucherId }).first();
    if (!voucher) {
      const error = new Error("Voucher not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    const redemptions = await db("voucher_redemptions as vr")
      .join("users as u", "vr.user_id", "u.id")
      .leftJoin("orders as o", "vr.order_id", "o.id")
      .where("vr.voucher_id", voucherId)
      .select(
        "vr.id",
        "u.name as user_name",
        "u.email as user_email",
        "vr.order_id",
        "o.total as order_total",
        "vr.redeemed_at"
      )
      .orderBy("vr.redeemed_at", "desc");

    return redemptions;
  }

  // --- 4. Orders Management (Admin / Restaurant Owner) ---
  static async listAdminOrders(user, { status, restaurant_id, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    let query = db("orders as o")
      .join("restaurants as r", "o.restaurant_id", "r.id")
      .join("users as u", "o.user_id", "u.id")
      .select(
        "o.id",
        "o.status",
        "o.total",
        "o.placed_at",
        "r.id as restaurant_id",
        "r.name as restaurant_name",
        "u.id as user_id",
        "u.name as user_name",
        "u.email as user_email",
        "o.rider_name"
      )
      .orderBy("o.placed_at", "desc");

    if (user.role === "restaurant_owner") {
      query = query.andWhere("r.owner_id", user.id);
    } else if (restaurant_id) {
      query = query.andWhere("o.restaurant_id", restaurant_id);
    }

    if (status) {
      query = query.andWhere("o.status", status);
    }

    const items = await query.limit(limit).offset(offset);
    return items;
  }

  static async updateOrderStatusOverride(orderId, user, newStatus) {
    const order = await db("orders").where({ id: orderId }).first();
    if (!order) {
      const error = new Error("Order not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    if (user.role === "restaurant_owner") {
      await this.verifyRestaurantOwnership(order.restaurant_id, user);
    }

    await db("orders").where({ id: orderId }).update({
      status: newStatus,
      updated_at: db.fn.now(),
    });

    const { emitOrderStatusUpdate } = await import("../../sockets/orderTracking.js");
    emitOrderStatusUpdate(orderId, { status: newStatus });

    return db("orders").where({ id: orderId }).first();
  }

  static async refundOrder(orderId, amount, reason) {
    return PaymentsService.refundOrder(orderId, amount, reason);
  }

  // --- 5. Users Management (Super Admin) ---
  static async listUsers({ search, role, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    let query = db("users").select("id", "name", "email", "phone", "role", "email_verified", "created_at");

    if (search) {
      query = query.where((b) => b.whereILike("name", `%${search}%`).orWhereILike("email", `%${search}%`));
    }

    if (role) {
      query = query.andWhere({ role });
    }

    return query.limit(limit).offset(offset).orderBy("created_at", "desc");
  }

  static async updateUserRole(userId, newRole, requestingAdmin) {
    if (requestingAdmin.role !== "admin") {
      const error = new Error("Forbidden: Only an admin can change user roles.");
      error.statusCode = HTTP_STATUS.FORBIDDEN;
      throw error;
    }

    await db("users").where({ id: userId }).update({ role: newRole });
    return db("users").where({ id: userId }).select("id", "name", "email", "role").first();
  }

  // --- 6. Rider Management ---
  static async listRiders(filters = {}) {
    return RiderRepository.listAllRiders(filters);
  }

  static async updateRiderStatus(riderId, accountStatus) {
    const validStatuses = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"];
    if (!validStatuses.includes(accountStatus)) {
      const error = new Error(`Invalid status. Allowed values: [${validStatuses.join(", ")}]`);
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }
    return RiderRepository.updateAccountStatus(riderId, accountStatus);
  }
}
