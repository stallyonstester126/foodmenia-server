import { Router } from "express";
import { OrdersController } from "./orders.controller.js";
import { authenticate } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { idempotency } from "../../middlewares/idempotency.js";
import {
  placeOrderSchema,
  orderIdParamSchema,
  listOrdersQuerySchema,
  cancelOrderSchema,
  sendMessageSchema,
} from "./orders.validation.js";

const router = Router();

// Protect all order routes
router.use(authenticate);

// Orders List & Place (Idempotent)
router.post("/", idempotency(), validate(placeOrderSchema), OrdersController.placeOrder);
router.get("/", validate(listOrdersQuerySchema), OrdersController.listOrders);

// Tracking & Live Progress
router.get("/:id/track", validate(orderIdParamSchema), OrdersController.trackOrder);
router.post("/:id/reorder", validate(orderIdParamSchema), OrdersController.reorder);
router.post("/:id/cancel", validate(cancelOrderSchema), OrdersController.cancelOrder);

// In-App Chat Messaging ("Contact your rider")
router.post("/:id/message", validate(sendMessageSchema), OrdersController.sendMessage);
router.get("/:id/messages", validate(orderIdParamSchema), OrdersController.getMessages);

// Order Details
router.get("/:id", validate(orderIdParamSchema), OrdersController.getOrderDetails);

export default router;
