import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { db } from "../database/connection.js";

let io = null;

export const initSocket = (httpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.ALLOWED_ORIGINS,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // JWT Socket Authentication Middleware
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1] ||
        socket.handshake.query?.token;

      if (!token) {
        return next(new Error("Authentication token required for Socket connection"));
      }

      const decoded = jwt.verify(token, env.JWT.SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      logger.warn("Socket connection rejected: Invalid JWT token");
      return next(new Error("Unauthorized: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    logger.info(`🔌 Socket connected: ${socket.id} (User: ${socket.user?.email})`);

    // Client joins order tracking room
    socket.on("joinOrder", async ({ orderId }) => {
      try {
        const order = await db("orders").where({ id: orderId }).first();
        if (!order) {
          return socket.emit("error", { message: "Order not found" });
        }

        // Verify order belongs to connected user
        if (order.user_id !== socket.user.id) {
          return socket.emit("error", { message: "Access denied to order room" });
        }

        const roomName = `order_${orderId}`;
        socket.join(roomName);
        logger.info(`👤 User ${socket.user.email} joined room [${roomName}]`);

        socket.emit("order:joined", {
          orderId,
          status: order.status,
          message: `Successfully joined tracking room for Order #${orderId}`,
        });
      } catch (err) {
        logger.error(`Error in joinOrder socket handler: ${err.message}`);
      }
    });

    // Client leaves order tracking room
    socket.on("leaveOrder", ({ orderId }) => {
      const roomName = `order_${orderId}`;
      socket.leave(roomName);
      logger.info(`👤 User ${socket.user?.email} left room [${roomName}]`);
    });

    // Restaurant Owner joins restaurant order tracking room
    socket.on("joinRestaurant", async ({ restaurantId }) => {
      try {
        if (!restaurantId) {
          return socket.emit("error", { message: "restaurantId is required" });
        }

        const userRole = socket.user?.role;
        if (userRole !== "restaurant_owner" && userRole !== "admin") {
          return socket.emit("error", { message: "Only restaurant owners or admins can join restaurant rooms" });
        }

        if (userRole === "restaurant_owner") {
          const restaurant = await db("restaurants")
            .where({ id: restaurantId, owner_id: socket.user.id })
            .first();

          if (!restaurant) {
            return socket.emit("error", { message: "Access denied: You do not own this restaurant" });
          }
        }

        const roomName = `restaurant_${restaurantId}`;
        socket.join(roomName);
        logger.info(`🏪 Restaurant Owner ${socket.user?.email} joined room [${roomName}]`);

        socket.emit("restaurant:joined", {
          restaurantId,
          message: `Successfully joined tracking room for Restaurant #${restaurantId}`,
        });
      } catch (err) {
        logger.error(`Error in joinRestaurant socket handler: ${err.message}`);
      }
    });

    // Restaurant Owner leaves restaurant room
    socket.on("leaveRestaurant", ({ restaurantId }) => {
      const roomName = `restaurant_${restaurantId}`;
      socket.leave(roomName);
      logger.info(`🏪 User ${socket.user?.email} left room [${roomName}]`);
    });

    socket.on("disconnect", () => {
      logger.info(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  return io;
};

// Broadcast status update to order room and restaurant owner room
export const emitOrderStatusUpdate = async (orderId, updateData) => {
  try {
    if (!io) return;
    const roomName = `order_${orderId}`;
    const payload = {
      orderId: Number(orderId),
      ...updateData,
      timestamp: new Date().toISOString(),
    };

    io.to(roomName).emit("order:statusUpdate", payload);
    logger.info(`📡 Broadcasted statusUpdate for Order #${orderId} -> [${updateData.status}] to room [${roomName}]`);

    let restaurantId = updateData.restaurantId;
    if (!restaurantId) {
      const order = await db("orders").where({ id: orderId }).select("restaurant_id").first();
      if (order) restaurantId = order.restaurant_id;
    }

    if (restaurantId) {
      const restRoom = `restaurant_${restaurantId}`;
      io.to(restRoom).emit("order:statusUpdate", payload);
      logger.info(`📡 Broadcasted statusUpdate for Order #${orderId} -> [${updateData.status}] to room [${restRoom}]`);
    }
  } catch (err) {
    logger.error(`Failed to broadcast statusUpdate for Order #${orderId}: ${err.message}`);
  }
};

// Broadcast new chat message to order room
export const emitOrderMessage = (orderId, messageData) => {
  try {
    if (!io) return;
    const roomName = `order_${orderId}`;
    io.to(roomName).emit("order:newMessage", {
      orderId,
      ...messageData,
    });
    logger.info(`💬 Broadcasted newMessage for Order #${orderId} to room [${roomName}]`);
  } catch (err) {
    logger.error(`Failed to broadcast newMessage for Order #${orderId}: ${err.message}`);
  }
};
