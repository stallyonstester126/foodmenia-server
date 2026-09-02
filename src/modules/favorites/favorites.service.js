import { FavoritesRepository } from "./favorites.repository.js";
import { HTTP_STATUS } from "../../config/constants.js";
import { db } from "../../database/connection.js";

export class FavoritesService {
  static async getUserFavorites(userId, type = null) {
    return FavoritesRepository.getFavoritesByUserId(userId, type);
  }

  static async addFavorite(userId, body) {
    let restaurant_id = body.restaurant_id || body.restaurantId || null;
    let menu_item_id = body.menu_item_id || body.menuItemId || null;

    if (body.targetId && body.type) {
      if (body.type === "restaurant" || body.type === "shop") {
        restaurant_id = Number(body.targetId);
      } else if (body.type === "menu_item") {
        menu_item_id = Number(body.targetId);
      }
    }

    // Validate exactly one target is provided
    if ((!restaurant_id && !menu_item_id) || (restaurant_id && menu_item_id)) {
      const error = new Error("Provide exactly one of restaurantId or menuItemId.");
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    // Validate entity existence
    if (restaurant_id) {
      const restaurant = await db("restaurants").where({ id: restaurant_id }).first();
      if (!restaurant) {
        const error = new Error("Restaurant not found.");
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }
    }

    if (menu_item_id) {
      const menuItem = await db("menu_items").where({ id: menu_item_id }).first();
      if (!menuItem) {
        const error = new Error("Menu item not found.");
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }
    }

    // Duplicate check
    const existing = await FavoritesRepository.findExistingFavorite(userId, restaurant_id, menu_item_id);
    if (existing) {
      return existing; // Return existing favorite cleanly
    }

    return FavoritesRepository.addFavorite(userId, { restaurant_id, menu_item_id });
  }

  static async removeFavorite(id, userId) {
    const favorite = await FavoritesRepository.getFavoriteById(id);
    if (!favorite) {
      const error = new Error("Favorite not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    if (Number(favorite.user_id) !== Number(userId)) {
      const error = new Error("Forbidden: You do not own this favorite.");
      error.statusCode = HTTP_STATUS.FORBIDDEN;
      throw error;
    }

    await FavoritesRepository.removeFavorite(id, userId);
    return { message: "Removed from favorites successfully." };
  }

  static async removeFavoriteByEntity(userId, { restaurantId, menuItemId, targetId, type }) {
    let restaurant_id = restaurantId || null;
    let menu_item_id = menuItemId || null;

    if (targetId && type) {
      if (type === "restaurant" || type === "shop") {
        restaurant_id = Number(targetId);
      } else if (type === "menu_item") {
        menu_item_id = Number(targetId);
      }
    }

    if (!restaurant_id && !menu_item_id) {
      const error = new Error("Provide restaurantId or menuItemId to remove.");
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    const deleted = await FavoritesRepository.removeFavoriteByEntity(userId, restaurant_id, menu_item_id);
    if (!deleted) {
      const error = new Error("Favorite not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }
    return { message: "Removed from favorites successfully." };
  }

  static async checkFavorite(userId, { restaurantId, menuItemId }) {
    const existing = await FavoritesRepository.findExistingFavorite(userId, restaurantId, menuItemId);
    return { isFavorite: Boolean(existing), favoriteId: existing ? existing.id : null };
  }
}
