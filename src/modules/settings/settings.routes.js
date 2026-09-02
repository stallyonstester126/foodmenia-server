import { Router } from "express";
import { SettingsController } from "./settings.controller.js";
import { authenticate } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { updateSettingsSchema } from "./settings.validation.js";

const router = Router();

// Protect all settings routes
router.use(authenticate);

router.get("/", SettingsController.getSettings);
router.patch("/", validate(updateSettingsSchema), SettingsController.updateSettings);

export default router;
