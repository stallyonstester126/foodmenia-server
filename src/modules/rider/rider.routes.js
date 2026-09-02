import { Router } from "express";
import { RiderController } from "./rider.controller.js";
import { authenticate } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/requireRole.js";

const router = Router();

// Public Rider Routes
router.post("/register", RiderController.register);

// Protected Rider Routes (requires authenticated rider)
router.use(authenticate);
router.use(requireRole("rider", "admin"));

router.get("/me", RiderController.getProfile);
router.post("/me/online", RiderController.toggleOnline);
router.post("/me/location", RiderController.updateLocation);

router.get("/orders/available", RiderController.getAvailableOrders);
router.get("/orders/current", RiderController.getActiveOrder);
router.post("/orders/:id/accept", RiderController.acceptOrder);
router.post("/orders/:id/status", RiderController.updateOrderStatus);

export default router;
