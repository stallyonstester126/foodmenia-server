import { MenuRepository } from "./menu.repository.js";
import { HTTP_STATUS } from "../../config/constants.js";

export class MenuService {
  static async getRestaurantMenu(restaurantId, categoryId = null) {
    return MenuRepository.getMenuByRestaurant(restaurantId, categoryId);
  }

  static async getMenuItemDetails(itemId) {
    const item = await MenuRepository.getItemById(itemId);
    if (!item) {
      const error = new Error("Menu item not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }
    return item;
  }
}
