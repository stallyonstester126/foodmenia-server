import { db } from "../../database/connection.js";

export class CartRepository {
  static async getOrCreateCart(userId, trx = null) {
    const q = () => (trx ? trx("carts") : db("carts"));
    let cart = await q().where({ user_id: userId }).first();
    if (!cart) {
      const [id] = await q().insert({
        user_id: userId,
        fulfillment_type: "delivery",
      });
      cart = await q().where({ id }).first();
    }
    return cart;
  }

  static async getCartWithItems(userId, trx = null) {
    const q = () => (trx ? trx : db);
    const cart = await this.getOrCreateCart(userId, trx);
    if (!cart) return null;

    let restaurant = null;
    if (cart.restaurant_id) {
      restaurant = await q()("restaurants")
        .where({ id: cart.restaurant_id })
        .select("id", "name", "profile_image_url", "cover_image_url", "address", "rating", "delivery_time_min", "delivery_time_max", "currency")
        .first();
    }

    const cartItems = await q()("cart_items as ci")
      .join("menu_items as mi", "ci.menu_item_id", "mi.id")
      .where("ci.cart_id", cart.id)
      .select(
        "ci.id",
        "ci.menu_item_id",
        "mi.name as item_name",
        "mi.image_url as item_image",
        "ci.quantity",
        "ci.unit_price_snapshot",
        "ci.special_instructions",
        "ci.unavailable_action",
        "ci.created_at"
      )
      .orderBy("ci.created_at", "asc");

    const cartItemIds = cartItems.map((item) => item.id);
    if (cartItemIds.length > 0) {
      const addons = await q()("cart_item_addons as cia")
        .leftJoin("item_addon_options as iao", "cia.addon_option_id", "iao.id")
        .leftJoin("item_addon_groups as iag", "iao.addon_group_id", "iag.id")
        .whereIn("cia.cart_item_id", cartItemIds)
        .select(
          "cia.id",
          "cia.cart_item_id",
          "cia.addon_option_id",
          db.raw("COALESCE(iao.name, 'Cheese Slice') as option_name"),
          db.raw("COALESCE(iag.name, 'ADD-ONS') as group_name"),
          "cia.price_snapshot"
        );

      cartItems.forEach((item) => {
        item.addons = addons.filter((a) => a.cart_item_id === item.id);
        const addonsTotal = item.addons.reduce((acc, a) => acc + Number(a.price_snapshot || 0), 0);
        item.item_total = (Number(item.unit_price_snapshot || 0) + addonsTotal) * item.quantity;
      });
    }

    return {
      id: cart.id,
      user_id: cart.user_id,
      restaurant,
      fulfillment_type: cart.fulfillment_type,
      items: cartItems,
      updated_at: cart.updated_at,
    };
  }

  static async addItem(cartId, menuItemId, quantity, specialInstructions, unavailableAction, unitPrice, selectedAddons = [], trx = null) {
    const query = trx ? trx : db;

    const [cartItemId] = await query("cart_items").insert({
      cart_id: cartId,
      menu_item_id: menuItemId,
      quantity,
      special_instructions: specialInstructions || null,
      unavailable_action: unavailableAction || "remove",
      unit_price_snapshot: unitPrice,
    });

    if (selectedAddons.length > 0) {
      const addonRows = [];
      const extraAddonNames = [];

      for (const addon of selectedAddons) {
        const numId = typeof addon.id === "number" ? addon.id : parseInt(String(addon.id).replace(/\D/g, ""), 10);
        if (!isNaN(numId) && numId > 0) {
          addonRows.push({
            cart_item_id: cartItemId,
            addon_option_id: numId,
            price_snapshot: addon.extra_price ?? 0,
          });
        } else {
          extraAddonNames.push(`+ ${addon.name || "Add-on"} (Rs. ${addon.extra_price || 0})`);
        }
      }

      if (addonRows.length > 0) {
        await query("cart_item_addons").insert(addonRows);
      }

      if (extraAddonNames.length > 0) {
        const appended = extraAddonNames.join(", ");
        const existing = specialInstructions || "";
        const updatedInst = existing ? `${existing} | Addons: ${appended}` : `Addons: ${appended}`;
        await query("cart_items").where({ id: cartItemId }).update({ special_instructions: updatedInst });
      }
    }

    return cartItemId;
  }

  static async updateItemQuantity(cartItemId, cartId, quantity, specialInstructions) {
    const updateData = {};
    if (quantity !== undefined) updateData.quantity = quantity;
    if (specialInstructions !== undefined) updateData.special_instructions = specialInstructions;

    return db("cart_items")
      .where({ id: cartItemId, cart_id: cartId })
      .update(updateData);
  }

  static async deleteItem(cartItemId, cartId) {
    return db("cart_items")
      .where({ id: cartItemId, cart_id: cartId })
      .delete();
  }

  static async clearCart(cartId, trx = null) {
    const query = trx ? trx : db;
    await query("cart_items").where({ cart_id: cartId }).delete();
    await query("carts").where({ id: cartId }).update({
      restaurant_id: null,
      updated_at: db.fn.now(),
    });
  }

  static async setFulfillmentType(cartId, fulfillmentType) {
    return db("carts").where({ id: cartId }).update({
      fulfillment_type: fulfillmentType,
      updated_at: db.fn.now(),
    });
  }

  static async setCartRestaurant(cartId, restaurantId, trx = null) {
    const query = trx ? trx("carts") : db("carts");
    return query.where({ id: cartId }).update({
      restaurant_id: restaurantId,
      updated_at: db.fn.now(),
    });
  }

  static async getCartSuggestions(restaurantId, itemIdsInCart) {
    if (!restaurantId) return [];

    let query = db("menu_items")
      .where({ restaurant_id: restaurantId, is_available: true })
      .select("id", "name", "description", "image_url", "base_price")
      .limit(6);

    if (itemIdsInCart.length > 0) {
      query = query.whereNotIn("id", itemIdsInCart);
    }

    return query;
  }
}
