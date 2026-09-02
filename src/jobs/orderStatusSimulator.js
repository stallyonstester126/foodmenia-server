import { db } from "../database/connection.js";
import { emitOrderStatusUpdate, emitOrderMessage } from "../sockets/orderTracking.js";
import { logger } from "../utils/logger.js";

const RIDERS_POOL = [
  "Tariq Mehmood (Honda 125 · ABC-5678)",
  "Usman Ali (Yamaha YBR · LEA-9012)",
  "Hamza Tariq (Suzuki GS · KHI-3456)",
  "Bilal Ahmed (Super Power · ISB-7890)",
];

const STATUS_TRANSITIONS = {
  placed: { next: "preparing", delaySeconds: 15, etaReduce: 5 },
  preparing: { next: "ready", delaySeconds: 20, etaReduce: 5 },
  ready: { next: "delivering", delaySeconds: 15, etaReduce: 10, assignRider: true },
  delivering: { next: "delivered", delaySeconds: 25, etaReduce: 0 },
};

let simulatorInterval = null;

export const startOrderStatusSimulator = (intervalMs = 5000) => {
  if (simulatorInterval) return;

  logger.info("⚙️  Order Status Simulator Worker started.");

  simulatorInterval = setInterval(async () => {
    try {
      // Find orders currently in progress
      const activeOrders = await db("orders")
        .whereIn("status", ["placed", "preparing", "ready", "delivering"])
        .select("id", "status", "estimated_delivery_min", "estimated_delivery_max", "rider_name", "assigned_rider_id", "fulfillment_type", "updated_at");

      const now = new Date();

      for (const order of activeOrders) {
        const transition = STATUS_TRANSITIONS[order.status];
        if (!transition) continue;

        // Do not auto-advance 'ready' delivery orders if they are waiting for a real rider to claim them
        if (order.status === "ready" && !order.assigned_rider_id && order.fulfillment_type !== "pickup") {
          continue;
        }

        const lastUpdated = new Date(order.updated_at || now);
        const elapsedSeconds = (now.getTime() - lastUpdated.getTime()) / 1000;

        if (elapsedSeconds >= transition.delaySeconds) {
          const nextStatus = transition.next;
          const updatePayload = {
            status: nextStatus,
            updated_at: db.fn.now(),
          };

          if (transition.assignRider && (!order.rider_name || order.rider_name === "Pending Assignment")) {
            const randomRider = RIDERS_POOL[Math.floor(Math.random() * RIDERS_POOL.length)];
            updatePayload.rider_name = randomRider;
          }

          if (transition.etaReduce) {
            updatePayload.estimated_delivery_min = Math.max(5, (order.estimated_delivery_min || 20) - transition.etaReduce);
            updatePayload.estimated_delivery_max = Math.max(10, (order.estimated_delivery_max || 35) - transition.etaReduce);
          }

          await db("orders").where({ id: order.id }).update(updatePayload);

          const updatedOrder = await db("orders").where({ id: order.id }).first();

          // Broadcast Socket.IO status update
          emitOrderStatusUpdate(order.id, {
            status: updatedOrder.status,
            estimatedDeliveryMin: updatedOrder.estimated_delivery_min,
            estimatedDeliveryMax: updatedOrder.estimated_delivery_max,
            riderName: updatedOrder.rider_name,
          });

          // Send automated system/rider chat message
          if (nextStatus === "preparing") {
            await createSystemMessage(order.id, "The kitchen is now preparing your delicious meal!");
          } else if (nextStatus === "delivering") {
            await createSystemMessage(order.id, `Rider ${updatedOrder.rider_name} has picked up your order and is on the way!`);
          } else if (nextStatus === "delivered") {
            await createSystemMessage(order.id, "Order has been delivered! Enjoy your meal! 🎉");
          }
        }
      }
    } catch (err) {
      logger.error("Error in Order Status Simulator tick:", err.message);
    }
  }, intervalMs);
};

const createSystemMessage = async (orderId, message) => {
  try {
    const [msgId] = await db("order_messages").insert({
      order_id: orderId,
      sender_type: "system",
      sender_name: "Foodmenia Support",
      message,
    });

    const inserted = await db("order_messages").where({ id: msgId }).first();
    emitOrderMessage(orderId, inserted);
  } catch (err) {
    logger.error(`Failed to insert system message for order ${orderId}:`, err.message);
  }
};

export const stopOrderStatusSimulator = () => {
  if (simulatorInterval) {
    clearInterval(simulatorInterval);
    simulatorInterval = null;
    logger.info("🛑 Order Status Simulator Worker stopped.");
  }
};
