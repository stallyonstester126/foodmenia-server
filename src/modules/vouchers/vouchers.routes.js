import { Router } from "express";
import { VouchersController } from "./vouchers.controller.js";
import { authenticate } from "../../middlewares/auth.js";

const router = Router();

router.get("/", authenticate, VouchersController.getAvailableVouchers);

export default router;
