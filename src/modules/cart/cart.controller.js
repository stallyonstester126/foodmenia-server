import { CartService } from "./cart.service.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HTTP_STATUS } from "../../config/constants.js";

export class CartController {
  static getCart = asyncHandler(async (req, res) => {
    const cart = await CartService.getCart(req.user.id);
    return ApiResponse.success(res, cart, "Cart retrieved successfully.", HTTP_STATUS.OK);
  });

  static addItem = asyncHandler(async (req, res) => {
    const cart = await CartService.addItem(req.user.id, req.body);
    return ApiResponse.success(res, cart, "Item added to cart successfully.", HTTP_STATUS.CREATED);
  });

  static updateItem = asyncHandler(async (req, res) => {
    const cartItemId = Number(req.params.id);
    const cart = await CartService.updateItem(req.user.id, cartItemId, req.body);
    return ApiResponse.success(res, cart, "Cart item updated successfully.", HTTP_STATUS.OK);
  });

  static removeItem = asyncHandler(async (req, res) => {
    const cartItemId = Number(req.params.id);
    const cart = await CartService.removeItem(req.user.id, cartItemId);
    return ApiResponse.success(res, cart, "Cart item removed successfully.", HTTP_STATUS.OK);
  });

  static switchFulfillment = asyncHandler(async (req, res) => {
    const { fulfillment_type } = req.body;
    const cart = await CartService.switchFulfillment(req.user.id, fulfillment_type);
    return ApiResponse.success(res, cart, `Fulfillment switched to ${fulfillment_type}.`, HTTP_STATUS.OK);
  });

  static clearCart = asyncHandler(async (req, res) => {
    const cart = await CartService.clearCart(req.user.id);
    return ApiResponse.success(res, cart, "Cart cleared successfully.", HTTP_STATUS.OK);
  });

  static getSuggestions = asyncHandler(async (req, res) => {
    const suggestions = await CartService.getSuggestions(req.user.id);
    return ApiResponse.success(res, suggestions, "Popular suggestions retrieved successfully.", HTTP_STATUS.OK);
  });
}
