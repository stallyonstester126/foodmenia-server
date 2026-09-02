import { Router } from "express";
import { MenuController } from "./menu.controller.js";
import { validate } from "../../middlewares/validate.js";
import { menuItemIdParamSchema } from "./menu.validation.js";

const router = Router();

// GET /api/v1/menu-items/:id
router.get("/:id", validate(menuItemIdParamSchema), MenuController.getMenuItemDetails);

export default router;
