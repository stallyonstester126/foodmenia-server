import { db } from "../../database/connection.js";

export class OrdersRepository {
  static async createOrder(orderData, trx = null) {
    const query = trx ? trx("orders") : db("orders");
    const [orderId] = await query.insert(orderData);
    return orderId;
  }

  static async insertOrderItems(items, trx = null) {
    const query = trx ? trx("order_items") : db("order_items");
    return query.insert(items);
  }

  static async insertOrderItemAddons(addons, trx = null) {
    const query = trx ? trx("order_item_addons") : db("order_item_addons");
    return query.insert(addons);
  }

  static async getOrderById(orderId, userId = null) {
    let query = db("orders as o")
      .join("restaurants as r", "o.restaurant_id", "r.id")
      .leftJoin("addresses as a", "o.address_id", "a.id")
      .leftJoin("payment_methods as pm", "o.payment_method_id", "pm.id")
      .leftJoin("vouchers as v", "o.voucher_id", "v.id")
      .where("o.id", orderId)
      .select(
        "o.id",
        "o.user_id",
        "o.restaurant_id",
        "r.name as restaurant_name",
        "r.profile_image_url as restaurant_profile_image",
        "r.cover_image_url as restaurant_cover_image",
        "r.address as restaurant_address",
        "r.lat as restaurant_lat",
        "r.lng as restaurant_lng",
        "o.address_id",
        "a.full_address as delivery_address",
        "a.lat as delivery_lat",
        "a.lng as delivery_lng",
        "a.label as address_label",
        "o.fulfillment_type",
        "o.status",
        "o.subtotal",
        "o.delivery_fee",
        "o.platform_fee",
        "o.discount_amount",
        "o.total",
        "o.payment_method_id",
        "pm.type as payment_type",
        "pm.provider as payment_provider",
        "pm.last4 as payment_last4",
        "o.voucher_id",
        "v.code as voucher_code",
        "o.delivery_instructions",
        "o.estimated_delivery_min",
        "o.estimated_delivery_max",
        "o.rider_name",
        "o.placed_at",
        "o.updated_at"
      );

    if (userId) {
      query = query.andWhere("o.user_id", userId);
    }

    const order = await query.first();
    if (!order) return null;

    // Fetch order items
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
        const addonsTotal = item.addons.reduce((acc, a) => acc + Number(a.price_snapshot), 0);
        item.item_total = (Number(item.unit_price_snapshot) + addonsTotal) * item.quantity;
      });
    }

    order.items = items;
    return order;
  }

  static async listUserOrders(userId, { status = null, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    let query = db("orders as o")
      .join("restaurants as r", "o.restaurant_id", "r.id")
      .where("o.user_id", userId)
      .select(
        "o.id",
        "o.restaurant_id",
        "r.name as restaurant_name",
        "r.profile_image_url as restaurant_profile_image",
        "r.cover_image_url as restaurant_cover_image",
        "o.fulfillment_type",
        "o.status",
        "o.subtotal",
        "o.delivery_fee",
        "o.platform_fee",
        "o.discount_amount",
        "o.total",
        "o.placed_at",
        "o.estimated_delivery_min",
        "o.estimated_delivery_max",
        "o.rider_name"
      )
      .orderBy("o.placed_at", "desc");

    if (status === "current") {
      query = query.whereIn("o.status", ["placed", "preparing", "ready", "delivering"]);
    } else if (status === "past") {
      query = query.whereIn("o.status", ["delivered", "cancelled"]);
    }

    const items = await query.limit(limit).offset(offset);

    // Attach item count and first item preview
    const orderIds = items.map((o) => o.id);
    if (orderIds.length > 0) {
      const orderItems = await db("order_items")
        .whereIn("order_id", orderIds)
        .select("order_id", "name_snapshot", "quantity");

      items.forEach((order) => {
        const matching = orderItems.filter((i) => i.order_id === order.id);
        order.total_items = matching.reduce((acc, i) => acc + i.quantity, 0);
        order.summary_items = matching.map((i) => `${i.quantity}x ${i.name_snapshot}`).join(", ");
      });
    }

    return items;
  }

  static async updateOrderStatus(orderId, status) {
    await db("orders").where({ id: orderId }).update({
      status,
      updated_at: db.fn.now(),
    });
    return db("orders").where({ id: orderId }).first();
  }

  static async addMessage(orderId, senderType, senderName, message) {
    const [id] = await db("order_messages").insert({
      order_id: orderId,
      sender_type: senderType,
      sender_name: senderName,
      message,
    });
    return db("order_messages").where({ id }).first();
  }

  static async getMessages(orderId) {
    return db("order_messages")
      .where({ order_id: orderId })
      .orderBy("created_at", "asc");
  }
}
