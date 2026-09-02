import { db } from "../../database/connection.js";

export class RiderRepository {
  static async createRider(userId, vehicleType = null, vehicleNumber = null) {
    const [riderId] = await db("riders").insert({
      user_id: userId,
      account_status: "PENDING",
      availability_status: "OFFLINE",
      vehicle_type: vehicleType,
      vehicle_number: vehicleNumber,
    });
    return this.findById(riderId);
  }

  static async findByUserId(userId) {
    return db("riders")
      .join("users", "riders.user_id", "=", "users.id")
      .select(
        "riders.*",
        "users.name",
        "users.email",
        "users.phone",
        "users.avatar_url",
        "users.email_verified"
      )
      .where("riders.user_id", userId)
      .first();
  }

  static async findById(riderId) {
    return db("riders")
      .join("users", "riders.user_id", "=", "users.id")
      .select(
        "riders.*",
        "users.name",
        "users.email",
        "users.phone",
        "users.avatar_url",
        "users.email_verified"
      )
      .where("riders.id", riderId)
      .first();
  }

  static async updateAvailability(riderId, availabilityStatus) {
    await db("riders")
      .where({ id: riderId })
      .update({
        availability_status: availabilityStatus,
        updated_at: db.fn.now(),
      });
    return this.findById(riderId);
  }

  static async updateAccountStatus(riderId, accountStatus) {
    await db("riders")
      .where({ id: riderId })
      .update({
        account_status: accountStatus,
        updated_at: db.fn.now(),
      });
    return this.findById(riderId);
  }

  static async updateLocation(riderId, { lat, lng, accuracy, heading, speed }) {
    await db("riders")
      .where({ id: riderId })
      .update({
        current_lat: lat,
        current_lng: lng,
        location_accuracy: accuracy || null,
        location_heading: heading || null,
        location_speed: speed || null,
        last_location_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
    return this.findById(riderId);
  }

  static async getAvailableOrders() {
    return db("orders")
      .join("restaurants", "orders.restaurant_id", "=", "restaurants.id")
      .leftJoin("addresses", "orders.address_id", "=", "addresses.id")
      .select(
        "orders.id as order_id",
        "orders.status",
        "orders.total",
        "orders.placed_at",
        "orders.fulfillment_type",
        "orders.delivery_instructions",
        "restaurants.id as restaurant_id",
        "restaurants.name as restaurant_name",
        "restaurants.address as restaurant_address",
        "restaurants.lat as restaurant_lat",
        "restaurants.lng as restaurant_lng",
        "addresses.full_address as customer_address",
        "addresses.lat as customer_lat",
        "addresses.lng as customer_lng"
      )
      .whereIn("orders.status", ["placed", "preparing", "ready"])
      .whereNull("orders.assigned_rider_id")
      .orderBy("orders.placed_at", "asc");
  }

  static async getActiveOrderForRider(riderId) {
    const rider = await db("riders").where({ id: riderId }).first();
    if (!rider || !rider.current_order_id) return null;

    const order = await db("orders")
      .join("restaurants", "orders.restaurant_id", "=", "restaurants.id")
      .leftJoin("addresses", "orders.address_id", "=", "addresses.id")
      .join("users", "orders.user_id", "=", "users.id")
      .select(
        "orders.*",
        "restaurants.name as restaurant_name",
        "restaurants.address as restaurant_address",
        "restaurants.lat as restaurant_lat",
        "restaurants.lng as restaurant_lng",
        "users.name as customer_name",
        "users.phone as customer_phone",
        "addresses.full_address as customer_address",
        "addresses.lat as customer_lat",
        "addresses.lng as customer_lng"
      )
      .where("orders.id", rider.current_order_id)
      .first();

    if (!order) return null;

    // Attach items and addons
    const items = await db("order_items as oi")
      .leftJoin("menu_items as mi", "oi.menu_item_id", "mi.id")
      .where("oi.order_id", order.id)
      .select(
        "oi.id",
        "oi.menu_item_id",
        "oi.name_snapshot as item_name",
        "mi.image_url as item_image",
        "oi.quantity",
        "oi.unit_price_snapshot",
        "oi.special_instructions"
      );

    const itemIds = items.map((i) => i.id);
    if (itemIds.length > 0) {
      const addons = await db("order_item_addons")
        .whereIn("order_item_id", itemIds)
        .select("id", "order_item_id", "name_snapshot as addon_name", "price_snapshot");

      items.forEach((item) => {
        item.addons = addons.filter((a) => a.order_item_id === item.id);
      });
    }

    order.items = items;
    return order;
  }

  static async atomicAcceptOrder(riderId, orderId) {
    return db.transaction(async (trx) => {
      // 1. Lock rider row & verify eligibility
      const rider = await trx("riders").where({ id: riderId }).forUpdate().first();
      if (!rider) {
        throw new Error("Rider profile not found.");
      }
      if (rider.account_status !== "APPROVED") {
        throw new Error("Rider account is not approved.");
      }
      if (rider.availability_status === "OFFLINE") {
        throw new Error("Rider must be ONLINE to accept orders.");
      }
      if (rider.current_order_id) {
        throw new Error("Rider already has an active order.");
      }

      // 2. Lock order row & verify unassigned state
      const order = await trx("orders").where({ id: orderId }).forUpdate().first();
      if (!order) {
        throw new Error("Order not found.");
      }
      if (order.assigned_rider_id) {
        throw new Error("This order has already been assigned to another rider.");
      }
      if (["delivered", "cancelled"].includes(order.status)) {
        throw new Error(`Order cannot be accepted because it is ${order.status}.`);
      }

      // 3. Atomically assign rider & set statuses
      const riderUser = await trx("users").where({ id: rider.user_id }).first();
      const riderName = riderUser ? riderUser.name : "Assigned Rider";

      await trx("orders")
        .where({ id: orderId })
        .update({
          assigned_rider_id: riderId,
          rider_name: riderName,
          status: order.status === "placed" ? "preparing" : order.status,
          updated_at: trx.fn.now(),
        });

      await trx("riders")
        .where({ id: riderId })
        .update({
          current_order_id: orderId,
          availability_status: "BUSY",
          updated_at: trx.fn.now(),
        });

      return trx("orders").where({ id: orderId }).first();
    });
  }

  static async updateOrderStatus(riderId, orderId, newStatus) {
    return db.transaction(async (trx) => {
      const rider = await trx("riders").where({ id: riderId }).first();
      if (!rider || String(rider.current_order_id) !== String(orderId)) {
        throw new Error("Rider is not assigned to this active order.");
      }

      const order = await trx("orders").where({ id: orderId }).first();
      if (!order) {
        throw new Error("Order not found.");
      }

      await trx("orders")
        .where({ id: orderId })
        .update({
          status: newStatus,
          updated_at: trx.fn.now(),
        });

      if (newStatus === "delivered" || newStatus === "cancelled") {
        await trx("riders")
          .where({ id: riderId })
          .update({
            current_order_id: null,
            availability_status: "ONLINE",
            updated_at: trx.fn.now(),
          });
      }

      return trx("orders").where({ id: orderId }).first();
    });
  }

  static async listAllRiders(filters = {}) {
    let query = db("riders")
      .join("users", "riders.user_id", "=", "users.id")
      .select(
        "riders.*",
        "users.name",
        "users.email",
        "users.phone",
        "users.avatar_url",
        "users.email_verified"
      );

    if (filters.accountStatus) {
      query = query.where("riders.account_status", filters.accountStatus);
    }
    if (filters.availabilityStatus) {
      query = query.where("riders.availability_status", filters.availabilityStatus);
    }
    if (filters.search) {
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      query = query.where((q) => {
        q.whereRaw("LOWER(users.name) LIKE ?", [searchTerm])
          .orWhereRaw("LOWER(users.email) LIKE ?", [searchTerm])
          .orWhereRaw("LOWER(users.phone) LIKE ?", [searchTerm])
          .orWhereRaw("LOWER(riders.vehicle_number) LIKE ?", [searchTerm]);
      });
    }

    return query.orderBy("riders.id", "desc");
  }
}
