import { RestaurantOwnerService } from "./restaurantOwner.service.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HTTP_STATUS } from "../../config/constants.js";

export class RestaurantOwnerController {
  // Onboarding & Profile
  static onboardRestaurant = asyncHandler(async (req, res) => {
    const restaurant = await RestaurantOwnerService.onboardRestaurant(req.user.id, req.body);
    return ApiResponse.success(res, restaurant, "Restaurant created successfully. Pending admin approval.", HTTP_STATUS.CREATED);
  });

  static getRestaurant = asyncHandler(async (req, res) => {
    const restaurant = await RestaurantOwnerService.getRestaurant(req.user.id);
    return ApiResponse.success(res, restaurant, "Restaurant retrieved successfully.", HTTP_STATUS.OK);
  });

  static updateRestaurant = asyncHandler(async (req, res) => {
    const restaurant = await RestaurantOwnerService.updateRestaurant(req.user.id, req.body);
    return ApiResponse.success(res, restaurant, "Restaurant updated successfully.", HTTP_STATUS.OK);
  });

  // Menu Categories
  static getCategories = asyncHandler(async (req, res) => {
    const categories = await RestaurantOwnerService.getCategories(req.user.id);
    return ApiResponse.success(res, categories, "Categories retrieved successfully.", HTTP_STATUS.OK);
  });

  static createCategory = asyncHandler(async (req, res) => {
    const category = await RestaurantOwnerService.createCategory(req.user.id, req.body);
    return ApiResponse.success(res, category, "Category created successfully.", HTTP_STATUS.CREATED);
  });

  static updateCategory = asyncHandler(async (req, res) => {
    const categoryId = Number(req.params.id);
    const category = await RestaurantOwnerService.updateCategory(req.user.id, categoryId, req.body);
    return ApiResponse.success(res, category, "Category updated successfully.", HTTP_STATUS.OK);
  });

  static deleteCategory = asyncHandler(async (req, res) => {
    const categoryId = Number(req.params.id);
    const result = await RestaurantOwnerService.deleteCategory(req.user.id, categoryId);
    return ApiResponse.success(res, null, result.message, HTTP_STATUS.OK);
  });

  // Menu Items
  static getMenuItems = asyncHandler(async (req, res) => {
    const categoryId = req.query.category_id ? Number(req.query.category_id) : null;
    const items = await RestaurantOwnerService.getMenuItems(req.user.id, categoryId);
    return ApiResponse.success(res, items, "Menu items retrieved successfully.", HTTP_STATUS.OK);
  });

  static createMenuItem = asyncHandler(async (req, res) => {
    const item = await RestaurantOwnerService.createMenuItem(req.user.id, req.body);
    return ApiResponse.success(res, item, "Menu item created successfully.", HTTP_STATUS.CREATED);
  });

  static updateMenuItem = asyncHandler(async (req, res) => {
    const itemId = Number(req.params.id);
    const item = await RestaurantOwnerService.updateMenuItem(req.user.id, itemId, req.body);
    return ApiResponse.success(res, item, "Menu item updated successfully.", HTTP_STATUS.OK);
  });

  static deleteMenuItem = asyncHandler(async (req, res) => {
    const itemId = Number(req.params.id);
    const result = await RestaurantOwnerService.deleteMenuItem(req.user.id, itemId);
    return ApiResponse.success(res, null, result.message, HTTP_STATUS.OK);
  });

  // Orders
  static getOrders = asyncHandler(async (req, res) => {
    const { status, page, limit } = req.query;
    const orders = await RestaurantOwnerService.getOrders(req.user.id, {
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    return ApiResponse.success(res, orders, "Orders retrieved successfully.", HTTP_STATUS.OK);
  });

  static updateOrderStatus = asyncHandler(async (req, res) => {
    const orderId = Number(req.params.id);
    const { status } = req.body;
    const order = await RestaurantOwnerService.updateOrderStatus(req.user.id, orderId, status);
    return ApiResponse.success(res, order, `Order status updated to '${status}'.`, HTTP_STATUS.OK);
  });
}
