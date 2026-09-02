import { Router } from "express";
import { RestaurantsController } from "./restaurants.controller.js";
import { MenuController } from "../menu/menu.controller.js";
import { validate } from "../../middlewares/validate.js";
import {
  listRestaurantsSchema,
  restaurantIdParamSchema,
} from "./restaurants.validation.js";
import { getMenuSchema } from "../menu/menu.validation.js";

const router = Router();

router.get("/", validate(listRestaurantsSchema), RestaurantsController.list);
router.get("/:id", validate(restaurantIdParamSchema), RestaurantsController.getById);
router.get("/:id/menu", validate(getMenuSchema), MenuController.getRestaurantMenu);

export default router;

