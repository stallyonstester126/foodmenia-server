import { Router } from "express";
import { PaymentsController } from "./payments.controller.js";
import { authenticate } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { idempotency } from "../../middlewares/idempotency.js";
import {
  savePaymentMethodSchema,
  paymentMethodIdParamSchema,
} from "./payments.validation.js";

const router = Router();

// Stripe Webhook Endpoint (Open, signature-verified)
router.post("/webhook", PaymentsController.webhook);

// Protected Payments Endpoints
router.post("/setup-intent", authenticate, PaymentsController.createSetupIntent);
router.post(
  "/methods",
  authenticate,
  idempotency(),
  validate(savePaymentMethodSchema),
  PaymentsController.savePaymentMethod
);
router.get("/methods", authenticate, PaymentsController.listPaymentMethods);
router.delete(
  "/methods/:id",
  authenticate,
  validate(paymentMethodIdParamSchema),
  PaymentsController.deletePaymentMethod
);

export default router;
