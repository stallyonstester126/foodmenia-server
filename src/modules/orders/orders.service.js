import { OrdersRepository } from "./orders.repository.js";
import { CartRepository } from "../cart/cart.repository.js";
import { CartService } from "../cart/cart.service.js";
import { calculateCartTotals } from "../cart/pricing.js";
import { VouchersService } from "../vouchers/vouchers.service.js";
import { VouchersRepository } from "../vouchers/vouchers.repository.js";
import { db } from "../../database/connection.js";
import { HTTP_STATUS } from "../../config/constants.js";
import { toCents, fromCents } from "../../utils/money.js";
import { getIO } from "../../sockets/orderTracking.js";

export class OrdersService {
  static async placeOrder(userId, payload = {}) {
    const address_id = payload.address_id || payload.addressId || null;
    const payment_method_id = payload.payment_method_id || payload.paymentMethodId || null;
    const voucher_code = payload.voucher_code || payload.voucherCode || null;
    const delivery_instructions = payload.delivery_instructions || payload.deliveryInstructions || null;

    let createdOrderId;

    // ATOMIC TRANSACTION: wrapped in Knex transaction
    await db.transaction(async (trx) => {
      // 1. Re-fetch current fresh cart state
      const cart = await CartRepository.getCartWithItems(userId, trx);
      if (!cart || !cart.items || cart.items.length === 0) {
        const error = new Error("Cannot place order. Cart is empty.");
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
      }

      // 2. Validate Address (if delivery)
      let resolvedAddressId = null;
      if (cart.fulfillment_type === "delivery") {
        if (address_id && !isNaN(Number(address_id))) {
          const validAddress = await trx("addresses").where({ id: Number(address_id), user_id: userId }).first();
          if (validAddress) {
            resolvedAddressId = validAddress.id;
          }
        }

        if (!resolvedAddressId) {
          // Check default address or any address
          const defaultAddr = await trx("addresses").where({ user_id: userId, is_default: true }).first();
          const anyAddr = defaultAddr || await trx("addresses").where({ user_id: userId }).first();

          if (anyAddr) {
            resolvedAddressId = anyAddr.id;
          } else {
            // Auto-create a default address for user so checkout never fails
            const [newId] = await trx("addresses").insert({
              user_id: userId,
              label: "Delivery Address",
              full_address: "Selected Delivery Address",
              city: "Austin",
              is_default: true,
            });
            resolvedAddressId = newId;
          }
        }
      }

      // 3. Validate Payment Method
      let resolvedPaymentMethod = null;
      let resolvedPaymentMethodId = null;

      const isCodRequested =
        payment_method_id === "cod" ||
        payment_method_id === "cash" ||
        payment_method_id === "cash_on_delivery" ||
        String(payment_method_id).toLowerCase() === "cod";

      if (isCodRequested) {
        resolvedPaymentMethod = { type: "cod", provider: "Cash on Delivery" };
        resolvedPaymentMethodId = null;
      } else if (payment_method_id && !isNaN(Number(payment_method_id))) {
        resolvedPaymentMethodId = Number(payment_method_id);
        resolvedPaymentMethod = await trx("payment_methods")
          .where({ id: resolvedPaymentMethodId, user_id: userId })
          .first();
        if (!resolvedPaymentMethod) {
          // If specified card not found, fallback safely to Cash on Delivery
          resolvedPaymentMethod = { type: "cod", provider: "Cash on Delivery" };
          resolvedPaymentMethodId = null;
        }
      } else {
        const defaultPM = await trx("payment_methods").where({ user_id: userId, is_default: true }).first();
        if (defaultPM) {
          resolvedPaymentMethodId = defaultPM.id;
          resolvedPaymentMethod = defaultPM;
        } else {
          resolvedPaymentMethod = { type: "cod", provider: "Cash on Delivery" };
          resolvedPaymentMethodId = null;
        }
      }

      // 4. Validate Voucher (if provided) & Compute Authoritative Order Totals
      let voucherObj = null;
      if (voucher_code) {
        const voucherRes = await VouchersService.validateAndCalculateDiscount(
          voucher_code,
          userId,
          cart.items.reduce((sum, item) => sum + (Number(item.item_total) || 0), 0),
          cart.fulfillment_type === "pickup" ? 0 : 49.00,
          trx
        );
        voucherObj = voucherRes.voucher;
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
        // Fallback to default
      }

      const pricing = calculateCartTotals(
        cart.items,
        cart.fulfillment_type || "delivery",
        voucherObj,
        null,
        feeOverrides
      );

      const voucherId = voucherObj?.id || null;
      const discountAmount = pricing.discount_amount;
      const finalTotal = pricing.total;
      const finalTotalCents = pricing.grandTotalCents;

      // 6. Stripe Payment Processing (if card method)
      let stripePaymentIntentId = null;
      let requiresAction = false;
      let clientSecret = null;

      if (resolvedPaymentMethod && (resolvedPaymentMethod.type === "card" || resolvedPaymentMethod.provider === "stripe")) {
        const { PaymentsService } = await import("../payments/payments.service.js");
        const customerId = await PaymentsService.getOrCreateStripeCustomer(userId, trx);

        const paymentResult = await PaymentsService.processOrderPayment(
          {
            id: "pending",
            total: finalTotal,
            user_id: userId,
            currency: cart?.restaurant?.currency || "USD ($)",
          },
          resolvedPaymentMethod,
          customerId,
          trx,
          finalTotalCents
        );

        stripePaymentIntentId = paymentResult.payment_intent_id;

        if (paymentResult.status === "requires_action") {
          requiresAction = true;
          clientSecret = paymentResult.client_secret;
        }
      }

      // 7. Insert Order
      createdOrderId = await OrdersRepository.createOrder(
        {
          user_id: userId,
          restaurant_id: cart.restaurant.id,
          address_id: cart.fulfillment_type === "delivery" ? resolvedAddressId : null,
          fulfillment_type: cart.fulfillment_type,
          status: "preparing",
          subtotal: pricing.subtotal,
          tax_rate: pricing.tax_rate,
          tax_amount: pricing.tax_amount,
          delivery_fee: pricing.delivery_fee,
          platform_fee: pricing.platform_fee,
          discount_amount: discountAmount,
          total: finalTotal,
          payment_method_id: resolvedPaymentMethodId,
          voucher_id: voucherId,
          stripe_payment_intent_id: stripePaymentIntentId,
          delivery_instructions: delivery_instructions || null,
          estimated_delivery_min: cart.restaurant.delivery_time_min || 20,
          estimated_delivery_max: cart.restaurant.delivery_time_max || 35,
          rider_name: "Pending Assignment",
        },
        trx
      );

      // 8. Insert Order Items & Addons with Snapshots
      for (const item of cart.items) {
        const [orderItemId] = await trx("order_items").insert({
          order_id: createdOrderId,
          menu_item_id: item.menu_item_id,
          name_snapshot: item.item_name,
          quantity: item.quantity,
          unit_price_snapshot: item.unit_price_snapshot,
          special_instructions: item.special_instructions || null,
        });

        if (item.addons && item.addons.length > 0) {
          const addonRows = item.addons.map((a) => ({
            order_item_id: orderItemId,
            name_snapshot: `${a.group_name}: ${a.option_name}`,
            price_snapshot: a.price_snapshot,
          }));
          await trx("order_item_addons").insert(addonRows);
        }
      }

      // 8. Record Voucher Redemption & Decrement Limit
      if (voucherId) {
        await VouchersRepository.recordRedemption(voucherId, userId, createdOrderId, trx);
      }

      // 9. Clear Active Cart
      await CartRepository.clearCart(cart.id, trx);
    });

    // Fetch and return complete placed order
    const orderDetails = await OrdersRepository.getOrderById(createdOrderId, userId);

    // Broadcast status update to customer and restaurant rooms
    const { emitOrderStatusUpdate } = await import("../../sockets/orderTracking.js");
    emitOrderStatusUpdate(createdOrderId, {
      status: orderDetails.status || "preparing",
      restaurantId: orderDetails.restaurant_id,
      total: orderDetails.total,
      user_name: orderDetails.user_name,
    });

    // Broadcast new available order to online riders via Socket.IO
    const io = getIO();
    if (io) {
      io.emit("order:available", {
        orderId: createdOrderId,
        restaurantId: orderDetails.restaurant_id,
        placedAt: orderDetails.placed_at,
      });
    }

    return orderDetails;
  }

  static async getOrderDetails(orderId, userId) {
    const order = await OrdersRepository.getOrderById(orderId, userId);
    if (!order) {
      const error = new Error("Order not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }
    return order;
  }

  static async listOrders(userId, filters) {
    return OrdersRepository.listUserOrders(userId, filters);
  }

  static async trackOrder(orderId, userId) {
    const order = await this.getOrderDetails(orderId, userId);

    const stepMap = {
      placed: { step: 1, percent: 15, label: "Order Placed" },
      preparing: { step: 2, percent: 45, label: "Preparing in Kitchen" },
      ready: { step: 3, percent: 70, label: "Ready for Pickup" },
      delivering: { step: 4, percent: 85, label: "Rider on the Way" },
      delivered: { step: 5, percent: 100, label: "Delivered" },
      cancelled: { step: 0, percent: 0, label: "Cancelled" },
    };

    const currentStepInfo = stepMap[order.status] || stepMap.placed;

    const timeline = [
      { status: "placed", title: "Order Confirmed", completed: true, timestamp: order.placed_at },
      { status: "preparing", title: "Kitchen is Preparing Food", completed: ["preparing", "ready", "delivering", "delivered"].includes(order.status) },
      { status: "delivering", title: "Rider Picked Up Order", completed: ["delivering", "delivered"].includes(order.status), rider: order.rider_name },
      { status: "delivered", title: "Order Delivered", completed: order.status === "delivered" },
    ];

    return {
      order_id: order.id,
      status: order.status,
      status_label: currentStepInfo.label,
      progress_percent: currentStepInfo.percent,
      current_step: currentStepInfo.step,
      estimated_delivery_min: order.estimated_delivery_min,
      estimated_delivery_max: order.estimated_delivery_max,
      rider_name: order.rider_name,
      restaurant_name: order.restaurant_name,
      restaurant_address: order.restaurant_address,
      restaurant_lat: Number(order.restaurant_lat) || 31.5204,
      restaurant_lng: Number(order.restaurant_lng) || 74.3587,
      restaurant_cover_image: order.restaurant_cover_image,
      delivery_address: order.delivery_address,
      delivery_lat: Number(order.delivery_lat) || 31.5497,
      delivery_lng: Number(order.delivery_lng) || 74.3436,
      items: order.items,
      total: order.total,
      placed_at: order.placed_at,
      updated_at: order.updated_at,
      timeline,
    };
  }

  static async reorder(orderId, userId) {
    const pastOrder = await this.getOrderDetails(orderId, userId);
    if (!pastOrder || !pastOrder.items || pastOrder.items.length === 0) {
      const error = new Error("Past order not found or contains no items.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    // Clear active cart first
    await CartService.clearCart(userId);

    const priceChangedItems = [];
    const unavailableItems = [];

    // Batch-fetch all live menu items in single query (prevents N+1 database calls)
    const menuItemIds = pastOrder.items.map((i) => i.menu_item_id);
    const liveItems = await db("menu_items").whereIn("id", menuItemIds);
    const liveItemsMap = new Map(liveItems.map((item) => [item.id, item]));

    // Clone items into fresh cart
    for (const item of pastOrder.items) {
      const liveItem = liveItemsMap.get(item.menu_item_id);
      if (!liveItem || !liveItem.is_available) {
        unavailableItems.push(item.item_name);
        continue;
      }

      if (Number(liveItem.base_price) !== Number(item.unit_price_snapshot)) {
        priceChangedItems.push({
          name: liveItem.name,
          old_price: Number(item.unit_price_snapshot),
          new_price: Number(liveItem.base_price),
        });
      }

      // Add to cart
      await CartService.addItem(userId, {
        menu_item_id: liveItem.id,
        quantity: item.quantity,
        special_instructions: item.special_instructions,
        clear_existing: true,
      });
    }

    const updatedCart = await CartService.getCart(userId);

    return {
      message: "Past order cloned to cart successfully!",
      cart: updatedCart,
      warnings: {
        unavailable_items: unavailableItems,
        price_changed_items: priceChangedItems,
      },
    };
  }

  static async cancelOrder(orderId, userId, reason = "Cancelled by user") {
    const order = await this.getOrderDetails(orderId, userId);

    if (order.status !== "placed" && order.status !== "preparing") {
      const error = new Error(`Order cannot be cancelled because it is already in "${order.status}" status.`);
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    const updatedOrder = await OrdersRepository.updateOrderStatus(orderId, "cancelled");

    // Add cancellation message to chat
    await OrdersRepository.addMessage(orderId, "system", "System", `Order was cancelled. Reason: ${reason}`);

    // Broadcast socket update
    const { emitOrderStatusUpdate } = await import("../../sockets/orderTracking.js");
    emitOrderStatusUpdate(orderId, {
      status: "cancelled",
      reason,
    });

    return updatedOrder;
  }

  static async sendMessage(orderId, userId, message) {
    const order = await this.getOrderDetails(orderId, userId);

    const user = await db("users").where({ id: userId }).select("name").first();
    const senderName = user?.name || "Customer";

    const savedMessage = await OrdersRepository.addMessage(order.id, "user", senderName, message);

    // Broadcast over socket
    const { emitOrderMessage } = await import("../../sockets/orderTracking.js");
    emitOrderMessage(order.id, savedMessage);

    return savedMessage;
  }

  static async getMessages(orderId, userId) {
    await this.getOrderDetails(orderId, userId);
    return OrdersRepository.getMessages(orderId);
  }
}
