import { RiderService } from "./rider.service.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { HTTP_STATUS } from "../../config/constants.js";

export class RiderController {
  static async register(req, res, next) {
    try {
      const { name, email, phone, password, vehicleType, vehicleNumber } = req.body;
      const result = await RiderService.registerRider({
        name,
        email,
        phone,
        password,
        vehicleType,
        vehicleNumber,
        deviceInfo: req.headers["user-agent"],
      });
      return ApiResponse.success(res, result, "Rider registered successfully. Verification code sent.", HTTP_STATUS.CREATED);
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req, res, next) {
    try {
      const profile = await RiderService.getRiderProfile(req.user.id);
      return ApiResponse.success(res, profile, "Rider profile fetched successfully.");
    } catch (error) {
      next(error);
    }
  }

  static async toggleOnline(req, res, next) {
    try {
      const { online } = req.body;
      const updated = await RiderService.toggleOnlineStatus(req.user.id, Boolean(online));
      return ApiResponse.success(
        res,
        updated,
        `Rider availability set to ${updated.availability_status}`
      );
    } catch (error) {
      next(error);
    }
  }

  static async updateLocation(req, res, next) {
    try {
      const { lat, lng, accuracy, heading, speed } = req.body;
      if (lat === undefined || lng === undefined) {
        return ApiResponse.error(res, "Latitude and Longitude are required.", HTTP_STATUS.BAD_REQUEST);
      }
      const updated = await RiderService.updateLocation(req.user.id, {
        lat: Number(lat),
        lng: Number(lng),
        accuracy,
        heading,
        speed,
      });
      return ApiResponse.success(res, updated, "Location updated successfully.");
    } catch (error) {
      next(error);
    }
  }

  static async getAvailableOrders(req, res, next) {
    try {
      const orders = await RiderService.getAvailableOrders(req.user.id);
      return ApiResponse.success(res, orders, "Available orders fetched successfully.");
    } catch (error) {
      next(error);
    }
  }

  static async getActiveOrder(req, res, next) {
    try {
      const activeOrder = await RiderService.getActiveOrder(req.user.id);
      return ApiResponse.success(res, activeOrder || null, "Active order fetched successfully.");
    } catch (error) {
      next(error);
    }
  }

  static async acceptOrder(req, res, next) {
    try {
      const { id } = req.params;
      const order = await RiderService.acceptOrder(req.user.id, id);
      return ApiResponse.success(res, order, "Order accepted successfully.");
    } catch (error) {
      next(error);
    }
  }

  static async updateOrderStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const order = await RiderService.updateOrderStatus(req.user.id, id, status);
      return ApiResponse.success(res, order, `Order status updated to ${order.status}`);
    } catch (error) {
      next(error);
    }
  }
}
