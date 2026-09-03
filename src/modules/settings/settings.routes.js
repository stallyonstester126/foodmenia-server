import { Router } from "express";
import { SettingsController } from "./settings.controller.js";
import { authenticate } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { updateSettingsSchema } from "./settings.validation.js";

const router = Router();

// Public platform configuration route
router.get("/platform", async (req, res, next) => {
  try {
    const { PlatformSettingsService } = await import("../../services/platformSettingsService.js");
    const settings = await PlatformSettingsService.getSettings();
    return res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

// Protect all user settings routes
router.use(authenticate);

router.get("/", SettingsController.getSettings);
router.patch("/", validate(updateSettingsSchema), SettingsController.updateSettings);

export default router;
