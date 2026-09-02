import Stripe from "stripe";
import { env } from "../../config/env.js";
import { db } from "../../database/connection.js";
import { HTTP_STATUS } from "../../config/constants.js";
import { logger } from "../../utils/logger.js";
import { emitOrderStatusUpdate } from "../../sockets/orderTracking.js";
import { toCents } from "../../utils/money.js";

const stripe = new Stripe(env.STRIPE.SECRET_KEY, {
  apiVersion: "2024-06-20",
});

function hasRealStripeKey() {
  return Boolean(env.STRIPE.SECRET_KEY && !env.STRIPE.SECRET_KEY.includes("placeholder"));
}

function hasRealWebhookSecret() {
  return Boolean(env.STRIPE.WEBHOOK_SECRET && !env.STRIPE.WEBHOOK_SECRET.includes("placeholder"));
}

export class PaymentsService {
  static getStripeInstance() {
    return stripe;
  }

  static async getOrCreateStripeCustomer(userId, trx = null) {
    const query = trx ? trx("users") : db("users");
    const user = await query.where({ id: userId }).first();
    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    if (user.stripe_customer_id) {
      return user.stripe_customer_id;
    }

    let customerId;

    if (hasRealStripeKey()) {
      // Case B: Real Stripe API Key configured. Do not swallow errors.
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: { userId: String(user.id) },
        });
        customerId = customer.id;
      } catch (err) {
        logger.error(`Stripe customer creation failed: ${err.message}`);
        const error = new Error(err.message || "Failed to create customer on payment gateway.");
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
      }
    } else {
      // Case A: Unconfigured / placeholder key (Dev/Test Environment)
      customerId = `cus_mock_${user.id}_${Date.now()}`;
    }

    await query.where({ id: userId }).update({ stripe_customer_id: customerId });
    return customerId;
  }

  static async createSetupIntent(userId) {
    const customerId = await this.getOrCreateStripeCustomer(userId);

    if (hasRealStripeKey()) {
      // Case B: Real Stripe call. Propagate errors.
      try {
        const setupIntent = await stripe.setupIntents.create({
          customer: customerId,
          payment_method_types: ["card"],
        });
        return {
          client_secret: setupIntent.client_secret,
          setup_intent_id: setupIntent.id,
          customer_id: customerId,
        };
      } catch (err) {
        logger.error(`Stripe setupIntent failed: ${err.message}`);
        const error = new Error(err.message || "Failed to create SetupIntent on payment gateway.");
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
      }
    }

    // Case A: Local Dev Mock
    return {
      client_secret: `seti_secret_mock_${Date.now()}`,
      setup_intent_id: `seti_mock_${Date.now()}`,
      customer_id: customerId,
    };
  }

  static async savePaymentMethod(userId, paymentMethodId, isDefault = false) {
    const customerId = await this.getOrCreateStripeCustomer(userId);

    let last4 = "4242";
    let brand = "Visa";

    if (hasRealStripeKey()) {
      // Case B: Real Stripe call. Never attach or persist mock cards if Stripe fails.
      try {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });

        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
        last4 = pm.card?.last4 || "4242";
        brand = pm.card?.brand || "card";
      } catch (err) {
        logger.error(`Stripe payment method attachment failed: ${err.message}`);
        const error = new Error(err.message || "Failed to attach card to customer account.");
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
      }
    }

    return db.transaction(async (trx) => {
      if (isDefault) {
        await trx("payment_methods").where({ user_id: userId }).update({ is_default: false });
      }

      const isFirst = (await trx("payment_methods").where({ user_id: userId }).count("id as count"))[0].count === 0;

      const [id] = await trx("payment_methods").insert({
        user_id: userId,
        type: "card",
        provider: "stripe",
        provider_payment_method_id: paymentMethodId,
        last4,
        brand,
        is_default: isDefault || isFirst,
      });

      return trx("payment_methods").where({ id }).first();
    });
  }

  static async listPaymentMethods(userId) {
    return db("payment_methods")
      .where({ user_id: userId })
      .orderBy("is_default", "desc")
      .orderBy("created_at", "desc");
  }

  static async deletePaymentMethod(userId, methodId) {
    const method = await db("payment_methods").where({ id: methodId, user_id: userId }).first();
    if (!method) {
      const error = new Error("Payment method not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    if (hasRealStripeKey() && method.provider_payment_method_id && !method.provider_payment_method_id.includes("mock")) {
      try {
        await stripe.paymentMethods.detach(method.provider_payment_method_id);
      } catch (err) {
        logger.error(`Stripe payment method detachment failed: ${err.message}`);
        const error = new Error(err.message || "Failed to detach payment method from Stripe.");
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
      }
    }

    await db("payment_methods").where({ id: methodId, user_id: userId }).delete();
    return { message: "Payment method deleted successfully." };
  }

  static async processOrderPayment(order, paymentMethod, customerId, trx = null, expectedAmountInCents = null) {
    const amountInCents = toCents(order.total);

    /**
     * MONEY INTEGRITY ASSERTION:
     * Guarantees zero discrepancy between server-computed order invoice total in cents
     * and the exact amount sent to Stripe's PaymentIntent API.
     */
    if (expectedAmountInCents !== null && expectedAmountInCents !== undefined) {
      if (amountInCents !== Number(expectedAmountInCents)) {
        logger.error(`🚨 MONEY ASSERTION MISMATCH: Server Cents=${expectedAmountInCents} vs Order Total Cents=${amountInCents} for Order Payload`);
        const error = new Error("Something went wrong with payment calculation. Please try again.");
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
      }
    }

    if (hasRealStripeKey() && paymentMethod.provider_payment_method_id !== "pm_mock") {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: "pkr",
          customer: customerId,
          payment_method: paymentMethod.provider_payment_method_id,
          confirm: true,
          off_session: false,
          metadata: {
            orderId: String(order.id),
            userId: String(order.user_id),
          },
          return_url: `${env.CLIENT_URL}/orders/${order.id}`,
        });

        if (paymentIntent.status === "requires_action") {
          return {
            status: "requires_action",
            client_secret: paymentIntent.client_secret,
            payment_intent_id: paymentIntent.id,
          };
        }

        if (paymentIntent.status !== "succeeded") {
          const error = new Error(`Payment confirmation failed: status is ${paymentIntent.status}`);
          error.statusCode = HTTP_STATUS.BAD_REQUEST;
          throw error;
        }

        return {
          status: "succeeded",
          payment_intent_id: paymentIntent.id,
        };
      } catch (stripeErr) {
        logger.error(`Stripe PaymentIntent processing error: ${stripeErr.message}`);
        const error = new Error(stripeErr.message || "Payment processing failed via Stripe.");
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
      }
    }

    // Mock fallback when in test environment without live credentials
    return {
      status: "succeeded",
      payment_intent_id: `pi_mock_${order.id}_${Date.now()}`,
    };
  }

  static async refundOrder(orderId, refundAmount = null, reason = "Requested by customer") {
    const order = await db("orders").where({ id: orderId }).first();
    if (!order) {
      const error = new Error("Order not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    const amountToRefund = refundAmount ? Number(refundAmount) : Number(order.total);

    if (hasRealStripeKey() && order.stripe_payment_intent_id && !order.stripe_payment_intent_id.includes("mock")) {
      try {
        await stripe.refunds.create({
          payment_intent: order.stripe_payment_intent_id,
          amount: Math.round(amountToRefund * 100),
          reason: "requested_by_customer",
        });
      } catch (err) {
        logger.error(`Stripe refund failed for Order #${orderId}: ${err.message}`);
        const error = new Error(`Stripe Refund Failed: ${err.message}`);
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
      }
    }

    await db("orders").where({ id: orderId }).update({
      status: "cancelled",
      refund_amount: amountToRefund,
      refund_reason: reason,
      updated_at: db.fn.now(),
    });

    emitOrderStatusUpdate(orderId, {
      status: "cancelled",
      refund_amount: amountToRefund,
      refund_reason: reason,
    });

    return {
      message: `Order #${orderId} refunded Rs. ${amountToRefund} successfully.`,
      refund_amount: amountToRefund,
      order_id: orderId,
    };
  }

  static async handleWebhook(rawBody, signature) {
    let event;

    try {
      if (hasRealWebhookSecret()) {
        event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE.WEBHOOK_SECRET);
      } else {
        event = JSON.parse(rawBody.toString());
      }
    } catch (err) {
      logger.error(`⚠️ Stripe Webhook signature verification failed: ${err.message}`);
      const error = new Error(`Webhook Error: ${err.message}`);
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    logger.info(`🔔 Stripe Webhook received: [${event.type}]`);

    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object;
        const orderId = pi.metadata?.orderId;
        if (orderId) {
          await db("orders").where({ id: orderId }).update({
            status: "placed",
            stripe_payment_intent_id: pi.id,
            updated_at: db.fn.now(),
          });
          emitOrderStatusUpdate(orderId, { status: "placed" });
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        const orderId = pi.metadata?.orderId;
        if (orderId) {
          await db("orders").where({ id: orderId }).update({
            status: "cancelled",
            refund_reason: pi.last_payment_error?.message || "Payment Failed",
            updated_at: db.fn.now(),
          });
          emitOrderStatusUpdate(orderId, { status: "cancelled", reason: "Payment Failed" });
        }
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object;
        const piId = charge.payment_intent;
        if (piId) {
          const refundedAmount = charge.amount_refunded / 100;
          await db("orders").where({ stripe_payment_intent_id: piId }).update({
            status: "cancelled",
            refund_amount: refundedAmount,
            updated_at: db.fn.now(),
          });
        }
        break;
      }
      default:
        logger.info(`Unhandled Stripe event type: ${event.type}`);
    }

    return { received: true };
  }
}
