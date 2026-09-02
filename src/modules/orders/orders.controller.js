import { OrdersService } from "./orders.service.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HTTP_STATUS } from "../../config/constants.js";

export class OrdersController {
  static placeOrder = asyncHandler(async (req, res) => {
    const order = await OrdersService.placeOrder(req.user.id, req.body);
    return ApiResponse.success(res, order, "Order placed successfully!", HTTP_STATUS.CREATED);
  });

  static getOrderDetails = asyncHandler(async (req, res) => {
    const orderId = Number(req.params.id);
    const order = await OrdersService.getOrderDetails(orderId, req.user.id);
    return ApiResponse.success(res, order, "Order details retrieved successfully.", HTTP_STATUS.OK);
  });

  static listOrders = asyncHandler(async (req, res) => {
    const orders = await OrdersService.listOrders(req.user.id, req.query);
    return ApiResponse.success(res, orders, "Orders retrieved successfully.", HTTP_STATUS.OK);
  });

  static trackOrder = asyncHandler(async (req, res) => {
    const orderId = Number(req.params.id);
    const trackingInfo = await OrdersService.trackOrder(orderId, req.user.id);
    return ApiResponse.success(res, trackingInfo, "Tracking information retrieved successfully.", HTTP_STATUS.OK);
  });

  static reorder = asyncHandler(async (req, res) => {
    const orderId = Number(req.params.id);
    const result = await OrdersService.reorder(orderId, req.user.id);
    return ApiResponse.success(res, result, result.message, HTTP_STATUS.OK);
  });

  static cancelOrder = asyncHandler(async (req, res) => {
    const orderId = Number(req.params.id);
    const reason = req.body.reason || "Cancelled by user";
    const order = await OrdersService.cancelOrder(orderId, req.user.id, reason);
    return ApiResponse.success(res, order, "Order cancelled successfully.", HTTP_STATUS.OK);
  });

  static sendMessage = asyncHandler(async (req, res) => {
    const orderId = Number(req.params.id);
    const { message } = req.body;
    const chatMessage = await OrdersService.sendMessage(orderId, req.user.id, message);
    return ApiResponse.success(res, chatMessage, "Message sent successfully.", HTTP_STATUS.CREATED);
  });

  static getMessages = asyncHandler(async (req, res) => {
    const orderId = Number(req.params.id);
    const messages = await OrdersService.getMessages(orderId, req.user.id);
    return ApiResponse.success(res, messages, "Order messages retrieved successfully.", HTTP_STATUS.OK);
  });
}
