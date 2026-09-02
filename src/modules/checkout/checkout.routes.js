import { Router } from "express";
import { CheckoutController } from "./checkout.controller.js";
import { authenticate } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import {
  applyVoucherSchema,
  addPaymentMethodSchema,
  checkoutSummaryQuerySchema,
} from "./checkout.validation.js";

const router = Router();

// Protect all checkout routes
router.use(authenticate);

// Vouchers & Summary
router.get("/summary", validate(checkoutSummaryQuerySchema), CheckoutController.getSummary);
router.post("/voucher/apply", validate(applyVoucherSchema), CheckoutController.applyVoucher);
router.post("/voucher/remove", CheckoutController.removeVoucher);

// Payment Methods
router.get("/payment-methods", CheckoutController.getPaymentMethods);
router.post("/payment-methods", validate(addPaymentMethodSchema), CheckoutController.addPaymentMethod);
router.delete("/payment-methods/:id", CheckoutController.deletePaymentMethod);

export default router;
