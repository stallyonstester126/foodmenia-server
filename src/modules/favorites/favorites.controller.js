import { FavoritesService } from "./favorites.service.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HTTP_STATUS } from "../../config/constants.js";

export class FavoritesController {
  static getFavorites = asyncHandler(async (req, res) => {
    const { type } = req.query;
    const favorites = await FavoritesService.getUserFavorites(req.user.id, type);
    return ApiResponse.success(res, favorites, "Favorites retrieved successfully.", HTTP_STATUS.OK);
  });

  static addFavorite = asyncHandler(async (req, res) => {
    const favorite = await FavoritesService.addFavorite(req.user.id, req.body);
    return ApiResponse.success(res, favorite, "Added to favorites successfully.", HTTP_STATUS.CREATED);
  });

  static removeFavorite = asyncHandler(async (req, res) => {
    if (req.params.id) {
      const favoriteId = Number(req.params.id);
      const result = await FavoritesService.removeFavorite(favoriteId, req.user.id);
      return ApiResponse.success(res, null, result.message, HTTP_STATUS.OK);
    }

    const { restaurantId, restaurant_id, menuItemId, menu_item_id, targetId, type } = req.query;
    const result = await FavoritesService.removeFavoriteByEntity(req.user.id, {
      restaurantId: restaurantId || restaurant_id,
      menuItemId: menuItemId || menu_item_id,
      targetId,
      type,
    });
    return ApiResponse.success(res, null, result.message, HTTP_STATUS.OK);
  });

  static checkFavorite = asyncHandler(async (req, res) => {
    const { restaurantId, restaurant_id, menuItemId, menu_item_id } = req.query;
    const status = await FavoritesService.checkFavorite(req.user.id, {
      restaurantId: restaurantId || restaurant_id,
      menuItemId: menuItemId || menu_item_id,
    });
    return ApiResponse.success(res, status, "Favorite status checked.", HTTP_STATUS.OK);
  });
}
