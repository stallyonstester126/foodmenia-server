import { RestaurantOwnerRepository } from "./restaurantOwner.repository.js";
import { AdminService } from "../admin/admin.service.js";
import { HTTP_STATUS } from "../../config/constants.js";

export class RestaurantOwnerService {
  static async onboardRestaurant(userId, data) {
    const existing = await RestaurantOwnerRepository.findRestaurantByOwnerId(userId);
    if (existing) {
      const error = new Error("You already have a restaurant registered to your owner account.");
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    return RestaurantOwnerRepository.createRestaurant(userId, data);
  }

  static async getRestaurant(userId) {
    const restaurant = await RestaurantOwnerRepository.findRestaurantByOwnerId(userId);
    if (!restaurant) {
      const error = new Error("No restaurant found for this owner.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }
    return restaurant;
  }

  static async updateRestaurant(userId, data) {
    await this.getRestaurant(userId);
    return RestaurantOwnerRepository.updateRestaurant(userId, data);
  }

  // --- Menu Categories ---
  static async getCategories(userId) {
    const restaurant = await this.getRestaurant(userId);
    return RestaurantOwnerRepository.getCategories(restaurant.id);
  }

  static async createCategory(userId, { name, sort_order = 0 }) {
    const restaurant = await this.getRestaurant(userId);
    return RestaurantOwnerRepository.createCategory(restaurant.id, name, sort_order);
  }

  static async updateCategory(userId, categoryId, data) {
    const restaurant = await this.getRestaurant(userId);
    const updated = await RestaurantOwnerRepository.updateCategory(categoryId, restaurant.id, data);
    if (!updated) {
      const error = new Error("Menu category not found or does not belong to your restaurant.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }
    return updated;
  }

  static async deleteCategory(userId, categoryId) {
    const restaurant = await this.getRestaurant(userId);
    const deletedCount = await RestaurantOwnerRepository.deleteCategory(categoryId, restaurant.id);
    if (!deletedCount) {
      const error = new Error("Menu category not found or does not belong to your restaurant.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }
    return { message: "Category deleted successfully." };
  }

  // --- Menu Items ---
  static async getMenuItems(userId, categoryId = null) {
    const restaurant = await this.getRestaurant(userId);
    return RestaurantOwnerRepository.getMenuItems(restaurant.id, categoryId);
  }

  static async createMenuItem(userId, itemData) {
    const restaurant = await this.getRestaurant(userId);
    return RestaurantOwnerRepository.createMenuItem(restaurant.id, itemData);
  }

  static async updateMenuItem(userId, itemId, updateData) {
    const restaurant = await this.getRestaurant(userId);
    const updated = await RestaurantOwnerRepository.updateMenuItem(itemId, restaurant.id, updateData);
    if (!updated) {
      const error = new Error("Menu item not found or does not belong to your restaurant.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }
    return updated;
  }

  static async deleteMenuItem(userId, itemId) {
    const restaurant = await this.getRestaurant(userId);
    const deletedCount = await RestaurantOwnerRepository.deleteMenuItem(itemId, restaurant.id);
    if (!deletedCount) {
      const error = new Error("Menu item not found or does not belong to your restaurant.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }
    return { message: "Menu item deleted successfully." };
  }

  // --- Orders ---
  static async getOrders(userId, { status, page = 1, limit = 20 }) {
    const restaurant = await this.getRestaurant(userId);
    return RestaurantOwnerRepository.getOrders(restaurant.id, { status, page, limit });
  }

  static async updateOrderStatus(userId, orderId, status) {
    const restaurant = await this.getRestaurant(userId);
    return AdminService.updateOrderStatusOverride(orderId, { id: userId, role: "restaurant_owner" }, status);
  }
}
