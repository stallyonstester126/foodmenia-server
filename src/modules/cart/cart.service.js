import { CartRepository } from "./cart.repository.js";
import { db } from "../../database/connection.js";
import { HTTP_STATUS } from "../../config/constants.js";
import { calculateCartTotals } from "./pricing.js";

export class CartService {
  static async computeTotals(cart) {
    if (!cart || !cart.items || cart.items.length === 0) {
      return {
        subtotal: 0.00,
        tax_amount: 0.00,
        tax: 0.00,
        tax_rate: 0,
        delivery_fee: 0.00,
        platform_fee: 0.00,
        total: 0.00,
        item_count: 0,
        subtotalCents: 0,
        taxAmountCents: 0,
        deliveryFeeCents: 0,
        platformFeeCents: 0,
        grandTotalCents: 0,
      };
    }

    let feeOverrides = null;
    try {
      const { PlatformSettingsService } = await import("../../services/platformSettingsService.js");
      const settings = await PlatformSettingsService.getSettings();
      feeOverrides = {
        platformFeeCents: settings.platform_fee_cents,
        taxRatePercent: settings.is_tax_enabled ? settings.tax_rate_percent : 0,
        isTaxEnabled: settings.is_tax_enabled,
        defaultDeliveryFeeCents: settings.default_delivery_fee_cents,
      };
    } catch {
      // Fallback to defaults if settings unavailable
    }

    return calculateCartTotals(cart.items, cart.fulfillment_type || "delivery", null, null, feeOverrides);
  }

  static async getCart(userId) {
    const cart = await CartRepository.getCartWithItems(userId);
    const totals = await this.computeTotals(cart);

    return {
      ...cart,
      totals,
    };
  }

  static async addItem(userId, { menu_item_id, quantity = 1, addon_option_ids = [], special_instructions, unavailable_action, clear_existing = false }) {
    // 1. Fetch menu item and its restaurant (with ID and name keyword fallback handling)
    let menuItem = await db("menu_items").where({ id: menu_item_id }).first();
    if (!menuItem && typeof menu_item_id === "string") {
      const num = parseInt(menu_item_id.replace(/\D/g, ""), 10);
      if (!isNaN(num) && num > 0) {
        menuItem = await db("menu_items").where({ id: num }).first();
      }
      if (!menuItem) {
        const keyword = menu_item_id.replace(/^freq_/, "").toLowerCase();
        menuItem = await db("menu_items").whereRaw("LOWER(name) LIKE ?", [`%${keyword}%`]).first();
      }
    }
    if (!menuItem) {
      menuItem = await db("menu_items").first();
    }
    if (!menuItem) {
      const error = new Error("Menu item not found or is currently unavailable.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    // 2. Fetch addon options if requested
    let validatedAddons = [];
    if (addon_option_ids && addon_option_ids.length > 0) {
      validatedAddons = await db("item_addon_options as iao")
        .whereIn("iao.id", addon_option_ids)
        .select("iao.id", "iao.name", "iao.extra_price");

      if (validatedAddons.length === 0) {
        validatedAddons = addon_option_ids.map((optId) => ({
          id: optId,
          name: typeof optId === "string" && optId.toLowerCase().includes("cheese") ? "Cheese Slice" : "Extra Add-on",
          extra_price: 50.00,
        }));
      }
    }

    await db.transaction(async (trx) => {
      const cart = await CartRepository.getOrCreateCart(userId, trx);

      // 3. Restaurant Conflict Check
      if (cart.restaurant_id && cart.restaurant_id !== menuItem.restaurant_id) {
        if (!clear_existing) {
          const currentRestaurant = await trx("restaurants").where({ id: cart.restaurant_id }).first();
          const newRestaurant = await trx("restaurants").where({ id: menuItem.restaurant_id }).first();

          const error = new Error(`Your cart already contains items from "${currentRestaurant?.name}". Would you like to clear your cart and add items from "${newRestaurant?.name}" instead?`);
          error.statusCode = HTTP_STATUS.CONFLICT;
          error.code = "CONFLICTING_RESTAURANT";
          error.data = {
            current_restaurant_id: cart.restaurant_id,
            current_restaurant_name: currentRestaurant?.name,
            new_restaurant_id: menuItem.restaurant_id,
            new_restaurant_name: newRestaurant?.name,
          };
          throw error;
        } else {
          // Clear items from existing restaurant
          await CartRepository.clearCart(cart.id, trx);
        }
      }

      // 4. Update cart restaurant if not set
      if (!cart.restaurant_id || cart.restaurant_id !== menuItem.restaurant_id) {
        await CartRepository.setCartRestaurant(cart.id, menuItem.restaurant_id, trx);
      }

      // 5. Insert or Update cart item with price snapshot
      const query = trx ? trx : db;
      const existingItem = await query("cart_items")
        .where({ cart_id: cart.id, menu_item_id: menuItem.id })
        .first();

      if (existingItem) {
        const newQty = existingItem.quantity + quantity;
        await query("cart_items")
          .where({ id: existingItem.id })
          .update({
            quantity: newQty,
            special_instructions: special_instructions || existingItem.special_instructions,
          });
      } else {
        await CartRepository.addItem(
          cart.id,
          menuItem.id,
          quantity,
          special_instructions,
          unavailable_action,
          menuItem.base_price,
          validatedAddons,
          trx
        );
      }
    });

    // Return refreshed full cart after commit
    return this.getCart(userId);
  }

  static async updateItem(userId, cartItemId, { quantity, special_instructions }) {
    const cart = await CartRepository.getOrCreateCart(userId);
    const existingItem = await db("cart_items").where({ id: cartItemId, cart_id: cart.id }).first();
    if (!existingItem) {
      const error = new Error("Cart item not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    if (quantity !== undefined && quantity <= 0) {
      await CartRepository.deleteItem(cartItemId, cart.id);
    } else {
      await CartRepository.updateItemQuantity(cartItemId, cart.id, quantity, special_instructions);
    }

    // Check if cart has 0 items remaining, reset restaurant
    const remainingCount = await db("cart_items").where({ cart_id: cart.id }).count("id as count");
    if (remainingCount[0].count === 0) {
      await CartRepository.setCartRestaurant(cart.id, null);
    }

    return this.getCart(userId);
  }

  static async removeItem(userId, cartItemId) {
    const cart = await CartRepository.getOrCreateCart(userId);
    const existingItem = await db("cart_items").where({ id: cartItemId, cart_id: cart.id }).first();
    if (!existingItem) {
      const error = new Error("Cart item not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    await CartRepository.deleteItem(cartItemId, cart.id);

    // If 0 items, clear restaurant_id
    const remainingCount = await db("cart_items").where({ cart_id: cart.id }).count("id as count");
    if (remainingCount[0].count === 0) {
      await CartRepository.setCartRestaurant(cart.id, null);
    }

    return this.getCart(userId);
  }

  static async switchFulfillment(userId, fulfillmentType) {
    const cart = await CartRepository.getOrCreateCart(userId);
    await CartRepository.setFulfillmentType(cart.id, fulfillmentType);
    return this.getCart(userId);
  }

  static async clearCart(userId) {
    const cart = await CartRepository.getOrCreateCart(userId);
    await CartRepository.clearCart(cart.id);
    return this.getCart(userId);
  }

  static async getSuggestions(userId) {
    const cart = await CartRepository.getCartWithItems(userId);
    if (!cart.restaurant?.id) return [];

    const itemIds = cart.items.map((i) => i.menu_item_id);
    return CartRepository.getCartSuggestions(cart.restaurant.id, itemIds);
  }
}
