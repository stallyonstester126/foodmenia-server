import { RestaurantsService } from "./restaurants.service.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HTTP_STATUS } from "../../config/constants.js";

export class RestaurantsController {
  static list = asyncHandler(async (req, res) => {
    const result = await RestaurantsService.listRestaurants(req.query);
    return ApiResponse.success(res, result, "Restaurants retrieved successfully.", HTTP_STATUS.OK);
  });

  static getById = asyncHandler(async (req, res) => {
    const restaurantId = Number(req.params.id);
    const restaurant = await RestaurantsService.getRestaurantDetails(restaurantId);
    return ApiResponse.success(res, restaurant, "Restaurant details retrieved successfully.", HTTP_STATUS.OK);
  });

  static getCuisines = asyncHandler(async (req, res) => {
    const cuisines = await RestaurantsService.getAllCuisines();
    return ApiResponse.success(res, cuisines, "Cuisines retrieved successfully.", HTTP_STATUS.OK);
  });
}
