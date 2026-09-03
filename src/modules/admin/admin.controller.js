import { AdminService } from "./admin.service.js";
import { OrdersService } from "../orders/orders.service.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HTTP_STATUS } from "../../config/constants.js";

export class AdminController {
  // Restaurants
  static listRestaurants = asyncHandler(async (req, res) => {
    const { search, status, type, page, limit } = req.query;
    const restaurants = await AdminService.listRestaurants({
      search,
      status,
      type,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    return ApiResponse.success(res, restaurants, "Restaurants retrieved successfully.", HTTP_STATUS.OK);
  });

  static getRestaurantDetails = asyncHandler(async (req, res) => {
    const restaurantId = Number(req.params.id);
    const details = await AdminService.getRestaurantDetails(restaurantId);
    return ApiResponse.success(res, details, "Restaurant details retrieved successfully.", HTTP_STATUS.OK);
  });

  static createRestaurant = asyncHandler(async (req, res) => {
    const restaurant = await AdminService.createRestaurant(req.user, req.body);
    return ApiResponse.success(res, restaurant, "Restaurant created successfully.", HTTP_STATUS.CREATED);
  });

  static updateRestaurant = asyncHandler(async (req, res) => {
    const restaurantId = Number(req.params.id);
    const updated = await AdminService.updateRestaurant(restaurantId, req.user, req.body);
    return ApiResponse.success(res, updated, "Restaurant updated successfully.", HTTP_STATUS.OK);
  });

  static toggleRestaurantActive = asyncHandler(async (req, res) => {
    const restaurantId = Number(req.params.id);
    const result = await AdminService.toggleRestaurantActive(restaurantId, req.user);
    return ApiResponse.success(res, result, "Restaurant status toggled successfully.", HTTP_STATUS.OK);
  });

  static deleteRestaurant = asyncHandler(async (req, res) => {
    const restaurantId = Number(req.params.id);
    const result = await AdminService.deleteRestaurant(restaurantId, req.user);
    return ApiResponse.success(res, null, result.message, HTTP_STATUS.OK);
  });

  // Categories & Menu
  static createCategory = asyncHandler(async (req, res) => {
    const restaurantId = Number(req.params.id);
    const category = await AdminService.createCategory(restaurantId, req.user, req.body.name, req.body.sort_order);
    return ApiResponse.success(res, category, "Menu category created successfully.", HTTP_STATUS.CREATED);
  });

  static createMenuItem = asyncHandler(async (req, res) => {
    const restaurantId = Number(req.params.id);
    const item = await AdminService.createMenuItem(restaurantId, req.user, req.body);
    return ApiResponse.success(res, item, "Menu item created successfully.", HTTP_STATUS.CREATED);
  });

  static updateMenuItem = asyncHandler(async (req, res) => {
    const itemId = Number(req.params.id);
    const item = await AdminService.updateMenuItem(itemId, req.user, req.body);
    return ApiResponse.success(res, item, "Menu item updated successfully.", HTTP_STATUS.OK);
  });

  static deleteMenuItem = asyncHandler(async (req, res) => {
    const itemId = Number(req.params.id);
    const result = await AdminService.deleteMenuItem(itemId, req.user);
    return ApiResponse.success(res, null, result.message, HTTP_STATUS.OK);
  });

  // Vouchers
  static listVouchers = asyncHandler(async (req, res) => {
    const vouchers = await AdminService.listVouchers(req.query);
    return ApiResponse.success(res, vouchers, "Vouchers retrieved successfully.", HTTP_STATUS.OK);
  });

  static createVoucher = asyncHandler(async (req, res) => {
    const voucher = await AdminService.createVoucher(req.body);
    return ApiResponse.success(res, voucher, "Voucher created successfully.", HTTP_STATUS.CREATED);
  });

  static updateVoucher = asyncHandler(async (req, res) => {
    const voucherId = Number(req.params.id);
    const updated = await AdminService.updateVoucher(voucherId, req.body);
    return ApiResponse.success(res, updated, "Voucher updated successfully.", HTTP_STATUS.OK);
  });

  static toggleVoucherActive = asyncHandler(async (req, res) => {
    const voucherId = Number(req.params.id);
    const updated = await AdminService.toggleVoucherActive(voucherId);
    return ApiResponse.success(res, updated, "Voucher active status toggled successfully.", HTTP_STATUS.OK);
  });

  static deleteVoucher = asyncHandler(async (req, res) => {
    const voucherId = Number(req.params.id);
    const result = await AdminService.deleteVoucher(voucherId);
    return ApiResponse.success(res, null, result.message, HTTP_STATUS.OK);
  });

  static getVoucherRedemptions = asyncHandler(async (req, res) => {
    const voucherId = Number(req.params.id);
    const redemptions = await AdminService.getVoucherRedemptions(voucherId);
    return ApiResponse.success(res, redemptions, "Voucher redemptions retrieved.", HTTP_STATUS.OK);
  });

  // Orders
  static listOrders = asyncHandler(async (req, res) => {
    const orders = await AdminService.listAdminOrders(req.user, req.query);
    return ApiResponse.success(res, orders, "Admin orders retrieved successfully.", HTTP_STATUS.OK);
  });

  static getOrderDetails = asyncHandler(async (req, res) => {
    const orderId = Number(req.params.id);
    const order = await OrdersService.getOrderDetails(orderId, null);
    return ApiResponse.success(res, order, "Order details retrieved.", HTTP_STATUS.OK);
  });

  static updateOrderStatus = asyncHandler(async (req, res) => {
    const orderId = Number(req.params.id);
    const { status } = req.body;
    const order = await AdminService.updateOrderStatusOverride(orderId, req.user, status);
    return ApiResponse.success(res, order, `Order status updated to ${status}.`, HTTP_STATUS.OK);
  });

  static refundOrder = asyncHandler(async (req, res) => {
    const orderId = Number(req.params.id);
    const { amount, reason } = req.body;
    const result = await AdminService.refundOrder(orderId, amount, reason);
    return ApiResponse.success(res, result, result.message, HTTP_STATUS.OK);
  });

  // Orders Analytics
  static getOrdersAnalytics = asyncHandler(async (req, res) => {
    const { restaurant_id, time_range } = req.query;
    const analytics = await AdminService.getOrdersAnalytics({ restaurant_id, time_range });
    return ApiResponse.success(res, analytics, "Orders analytics retrieved successfully.", HTTP_STATUS.OK);
  });

  // Platform Tax & Fees Configuration
  static getPlatformSettings = asyncHandler(async (req, res) => {
    const settings = await AdminService.getPlatformSettings();
    return ApiResponse.success(res, settings, "Platform settings retrieved successfully.", HTTP_STATUS.OK);
  });

  static updatePlatformSettings = asyncHandler(async (req, res) => {
    const settings = await AdminService.updatePlatformSettings(req.body, req.user);
    return ApiResponse.success(res, settings, "Platform settings updated successfully.", HTTP_STATUS.OK);
  });

  // Users
  static listUsers = asyncHandler(async (req, res) => {
    const users = await AdminService.listUsers(req.query);
    return ApiResponse.success(res, users, "Users list retrieved successfully.", HTTP_STATUS.OK);
  });

  static updateUserRole = asyncHandler(async (req, res) => {
    const userId = Number(req.params.id);
    const { role } = req.body;
    const user = await AdminService.updateUserRole(userId, role, req.user);
    return ApiResponse.success(res, user, `User role updated to ${role}.`, HTTP_STATUS.OK);
  });

  // Riders
  static listRiders = asyncHandler(async (req, res) => {
    const { search, accountStatus, availabilityStatus } = req.query;
    const riders = await AdminService.listRiders({ search, accountStatus, availabilityStatus });
    return ApiResponse.success(res, riders, "Riders retrieved successfully.", HTTP_STATUS.OK);
  });

  static updateRiderStatus = asyncHandler(async (req, res) => {
    const riderId = Number(req.params.id);
    const { accountStatus } = req.body;
    const rider = await AdminService.updateRiderStatus(riderId, accountStatus);
    return ApiResponse.success(res, rider, `Rider account status updated to ${accountStatus}.`, HTTP_STATUS.OK);
  });
}
