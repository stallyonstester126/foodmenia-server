import { Router } from "express";
import { AdminController } from "./admin.controller.js";
import { authenticate } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { validate } from "../../middlewares/validate.js";
import { idempotency } from "../../middlewares/idempotency.js";
import {
  createRestaurantSchema,
  createMenuItemSchema,
  createVoucherSchema,
  updateOrderStatusSchema,
  refundOrderSchema,
  updateUserRoleSchema,
} from "./admin.validation.js";

const router = Router();

// Protect all admin routes with authentication
router.use(authenticate);

// 1. Restaurants & Menu (Admin & Restaurant Owner)
router.get(
  "/restaurants",
  requireRole("admin"),
  AdminController.listRestaurants
);
router.get(
  "/restaurants/:id",
  requireRole("admin", "restaurant_owner"),
  AdminController.getRestaurantDetails
);
router.post(
  "/restaurants",
  requireRole("admin", "restaurant_owner"),
  validate(createRestaurantSchema),
  AdminController.createRestaurant
);
router.patch(
  "/restaurants/:id",
  requireRole("admin", "restaurant_owner"),
  AdminController.updateRestaurant
);
router.patch(
  "/restaurants/:id/toggle-active",
  requireRole("admin", "restaurant_owner"),
  AdminController.toggleRestaurantActive
);
router.delete(
  "/restaurants/:id",
  requireRole("admin", "restaurant_owner"),
  AdminController.deleteRestaurant
);

// Categories & Menu Items
router.post(
  "/restaurants/:id/categories",
  requireRole("admin", "restaurant_owner"),
  AdminController.createCategory
);
router.post(
  "/restaurants/:id/menu-items",
  requireRole("admin", "restaurant_owner"),
  validate(createMenuItemSchema),
  AdminController.createMenuItem
);
router.patch(
  "/menu-items/:id",
  requireRole("admin", "restaurant_owner"),
  AdminController.updateMenuItem
);
router.delete(
  "/menu-items/:id",
  requireRole("admin", "restaurant_owner"),
  AdminController.deleteMenuItem
);

// 2. Vouchers Management (Admin Only)
router.get(
  "/vouchers",
  requireRole("admin"),
  AdminController.listVouchers
);
router.post(
  "/vouchers",
  requireRole("admin"),
  validate(createVoucherSchema),
  AdminController.createVoucher
);
router.patch(
  "/vouchers/:id",
  requireRole("admin"),
  AdminController.updateVoucher
);
router.patch(
  "/vouchers/:id/toggle-active",
  requireRole("admin"),
  AdminController.toggleVoucherActive
);
router.delete(
  "/vouchers/:id",
  requireRole("admin"),
  AdminController.deleteVoucher
);
router.get(
  "/vouchers/:id/redemptions",
  requireRole("admin"),
  AdminController.getVoucherRedemptions
);

// 3. Orders Management (Admin & Restaurant Owner)
router.get(
  "/orders",
  requireRole("admin", "restaurant_owner"),
  AdminController.listOrders
);
router.get(
  "/orders/:id",
  requireRole("admin", "restaurant_owner"),
  AdminController.getOrderDetails
);
router.patch(
  "/orders/:id/status",
  requireRole("admin", "restaurant_owner"),
  validate(updateOrderStatusSchema),
  AdminController.updateOrderStatus
);
router.post(
  "/orders/:id/refund",
  requireRole("admin"),
  idempotency(),
  validate(refundOrderSchema),
  AdminController.refundOrder
);

// 4. Users Management (Super Admin Only)
router.get(
  "/users",
  requireRole("admin"),
  AdminController.listUsers
);
router.patch(
  "/users/:id/role",
  requireRole("admin"),
  validate(updateUserRoleSchema),
  AdminController.updateUserRole
);

// 5. Riders Management (Super Admin Only)
router.get(
  "/riders",
  requireRole("admin"),
  AdminController.listRiders
);
router.patch(
  "/riders/:id/status",
  requireRole("admin"),
  AdminController.updateRiderStatus
);

export default router;
