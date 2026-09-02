import { MenuService } from "./menu.service.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HTTP_STATUS } from "../../config/constants.js";

export class MenuController {
  static getRestaurantMenu = asyncHandler(async (req, res) => {
    const restaurantId = Number(req.params.id);
    const categoryId = req.query.category ? Number(req.query.category) : null;
    const menu = await MenuService.getRestaurantMenu(restaurantId, categoryId);
    return ApiResponse.success(res, menu, "Restaurant menu retrieved successfully.", HTTP_STATUS.OK);
  });

  static getMenuItemDetails = asyncHandler(async (req, res) => {
    const itemId = Number(req.params.id);
    const item = await MenuService.getMenuItemDetails(itemId);
    return ApiResponse.success(res, item, "Menu item details retrieved successfully.", HTTP_STATUS.OK);
  });
}
