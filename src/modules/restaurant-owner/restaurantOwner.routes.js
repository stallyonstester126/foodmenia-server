import { Router } from "express";
import { RestaurantOwnerController } from "./restaurantOwner.controller.js";
import { authenticate } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { validate } from "../../middlewares/validate.js";
import {
  onboardRestaurantSchema,
  updateRestaurantSchema,
  createCategorySchema,
  updateCategorySchema,
  createMenuItemSchema,
  updateMenuItemSchema,
  updateOrderStatusSchema,
} from "./restaurantOwner.validation.js";

const router = Router();

// All restaurant-owner routes require authentication and 'restaurant_owner' role
router.use(authenticate);
router.use(requireRole("restaurant_owner"));

// Onboarding & Profile
router.post("/restaurants", validate(onboardRestaurantSchema), RestaurantOwnerController.onboardRestaurant);
router.get("/restaurant", RestaurantOwnerController.getRestaurant);
router.patch("/restaurant", validate(updateRestaurantSchema), RestaurantOwnerController.updateRestaurant);

// Menu Categories
router.get("/menu-categories", RestaurantOwnerController.getCategories);
router.post("/menu-categories", validate(createCategorySchema), RestaurantOwnerController.createCategory);
router.patch("/menu-categories/:id", validate(updateCategorySchema), RestaurantOwnerController.updateCategory);
router.delete("/menu-categories/:id", RestaurantOwnerController.deleteCategory);

// Menu Items
router.get("/menu-items", RestaurantOwnerController.getMenuItems);
router.post("/menu-items", validate(createMenuItemSchema), RestaurantOwnerController.createMenuItem);
router.patch("/menu-items/:id", validate(updateMenuItemSchema), RestaurantOwnerController.updateMenuItem);
router.delete("/menu-items/:id", RestaurantOwnerController.deleteMenuItem);

// Orders
router.get("/orders", RestaurantOwnerController.getOrders);
router.patch("/orders/:id/status", validate(updateOrderStatusSchema), RestaurantOwnerController.updateOrderStatus);

export default router;
