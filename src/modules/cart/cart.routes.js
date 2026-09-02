import { Router } from "express";
import { CartController } from "./cart.controller.js";
import { authenticate } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import {
  addItemSchema,
  updateItemSchema,
  cartItemIdParamSchema,
  switchFulfillmentSchema,
} from "./cart.validation.js";

const router = Router();

// All cart operations require authentication
router.use(authenticate);

router.get("/", CartController.getCart);
router.post("/items", validate(addItemSchema), CartController.addItem);
router.patch("/items/:id", validate(updateItemSchema), CartController.updateItem);
router.delete("/items/:id", validate(cartItemIdParamSchema), CartController.removeItem);
router.patch("/fulfillment", validate(switchFulfillmentSchema), CartController.switchFulfillment);
router.delete("/", CartController.clearCart);
router.get("/suggestions", CartController.getSuggestions);

export default router;
