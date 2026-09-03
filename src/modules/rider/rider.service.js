import { RiderRepository } from "./rider.repository.js";
import { AuthService } from "../auth/auth.service.js";
import { AuthRepository } from "../auth/auth.repository.js";
import { emitOrderStatusUpdate, emitOrderMessage, getIO } from "../../sockets/orderTracking.js";
import { HTTP_STATUS } from "../../config/constants.js";
import { db } from "../../database/connection.js";

export class RiderService {
  static async registerRider({ name, email, phone, password, vehicleType, vehicleNumber, deviceInfo }) {
    const userResult = await AuthService.register(name, email, password, phone, "rider", deviceInfo);
    const rider = await RiderRepository.createRider(userResult.user.id, vehicleType, vehicleNumber);

    return {
      user: userResult.user,
      tokens: userResult.tokens,
      rider,
    };
  }

  static async getRiderProfile(userId) {
    let rider = await RiderRepository.findByUserId(userId);
    if (!rider) {
      const user = await AuthRepository.findById(userId);
      if (user && user.role === "rider") {
        rider = await RiderRepository.createRider(userId, "Motorbike", "N/A");
      } else {
        const error = new Error("Rider profile not found. Please log in with a registered Rider account.");
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }
    }
    return rider;
  }

  static async toggleOnlineStatus(userId, online) {
    const rider = await RiderRepository.findByUserId(userId);
    if (!rider) {
      const error = new Error("Rider profile not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    if (online) {
      if (!rider.email_verified) {
        const error = new Error("Email verification is required before going online.");
        error.statusCode = HTTP_STATUS.FORBIDDEN;
        throw error;
      }
      if (rider.account_status !== "APPROVED") {
        const error = new Error(`Account status is ${rider.account_status}. You must be APPROVED by Admin to go online.`);
        error.statusCode = HTTP_STATUS.FORBIDDEN;
        throw error;
      }

      const updated = await RiderRepository.updateAvailability(rider.id, "ONLINE");
      const io = getIO();
      if (io) {
        io.to("admin_dispatch").emit("rider:availabilityChanged", {
          riderId: rider.id,
          availabilityStatus: "ONLINE",
        });
      }
      return updated;
    } else {
      if (rider.current_order_id) {
        const error = new Error("Cannot go offline while delivering an active order.");
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
      }

      const updated = await RiderRepository.updateAvailability(rider.id, "OFFLINE");
      const io = getIO();
      if (io) {
        io.to("admin_dispatch").emit("rider:availabilityChanged", {
          riderId: rider.id,
          availabilityStatus: "OFFLINE",
        });
      }
      return updated;
    }
  }

  static async updateLocation(userId, { lat, lng, accuracy, heading, speed }) {
    const rider = await RiderRepository.findByUserId(userId);
    if (!rider) {
      const error = new Error("Rider profile not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    const updated = await RiderRepository.updateLocation(rider.id, { lat, lng, accuracy, heading, speed });

    const io = getIO();
    if (io) {
      const payload = {
        riderId: rider.id,
        riderName: rider.name,
        lat,
        lng,
        accuracy,
        heading,
        speed,
        timestamp: new Date().toISOString(),
      };

      io.to("admin_dispatch").emit("rider:locationUpdate", payload);

      if (rider.current_order_id) {
        io.to(`order_${rider.current_order_id}`).emit("rider:location_updated", payload);
      }
    }

    return updated;
  }

  static async getAvailableOrders(userId) {
    const rider = await RiderRepository.findByUserId(userId);
    if (!rider) {
      const error = new Error("Rider profile not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    if (rider.account_status !== "APPROVED") {
      const error = new Error("Rider account must be APPROVED to view orders.");
      error.statusCode = HTTP_STATUS.FORBIDDEN;
      throw error;
    }

    return RiderRepository.getAvailableOrders();
  }

  static async getActiveOrder(userId) {
    const rider = await RiderRepository.findByUserId(userId);
    if (!rider) {
      const error = new Error("Rider profile not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    return RiderRepository.getActiveOrderForRider(rider.id);
  }

  static async acceptOrder(userId, orderId) {
    const rider = await RiderRepository.findByUserId(userId);
    if (!rider) {
      const error = new Error("Rider profile not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    try {
      const order = await RiderRepository.atomicAcceptOrder(rider.id, orderId);

      // Broadcast real-time events
      emitOrderStatusUpdate(orderId, {
        status: order.status,
        riderName: rider.name,
        riderPhone: rider.phone,
        assignedRiderId: rider.id,
        restaurantId: order.restaurant_id,
      });

      const io = getIO();
      if (io) {
        io.emit("order:assigned", { orderId, riderId: rider.id });
        io.to("admin_dispatch").emit("rider:availabilityChanged", {
          riderId: rider.id,
          availabilityStatus: "BUSY",
          currentOrderId: orderId,
        });
      }

      return order;
    } catch (err) {
      const error = new Error(err.message || "Failed to accept order.");
      error.statusCode = err.statusCode || HTTP_STATUS.CONFLICT;
      throw error;
    }
  }

  static async updateOrderStatus(userId, orderId, newStatus) {
    const rider = await RiderRepository.findByUserId(userId);
    if (!rider) {
      const error = new Error("Rider profile not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    const validStatuses = ["delivering", "delivered"];
    if (!validStatuses.includes(newStatus)) {
      const error = new Error(`Invalid status transition. Allowed values: [${validStatuses.join(", ")}]`);
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    const order = await RiderRepository.updateOrderStatus(rider.id, orderId, newStatus);

    emitOrderStatusUpdate(orderId, {
      status: order.status,
      riderName: rider.name,
      riderPhone: rider.phone,
      assignedRiderId: rider.id,
      restaurantId: order.restaurant_id,
    });

    const io = getIO();
    if (io && (newStatus === "delivered" || newStatus === "cancelled")) {
      io.to("admin_dispatch").emit("rider:availabilityChanged", {
        riderId: rider.id,
        availabilityStatus: "ONLINE",
        currentOrderId: null,
      });
    }

    return order;
  }
}
