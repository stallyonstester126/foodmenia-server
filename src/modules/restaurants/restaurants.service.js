import { RestaurantsRepository } from "./restaurants.repository.js";
import { HTTP_STATUS } from "../../config/constants.js";

export class RestaurantsService {
  static async listRestaurants(filters) {
    return RestaurantsRepository.list(filters);
  }

  static async getRestaurantDetails(id) {
    const restaurant = await RestaurantsRepository.findById(id);
    if (!restaurant) {
      const error = new Error("Restaurant not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }
    return restaurant;
  }

  static async getAllCuisines() {
    return RestaurantsRepository.getCuisines();
  }
}
