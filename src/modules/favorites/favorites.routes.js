import { Router } from "express";
import { FavoritesController } from "./favorites.controller.js";
import { authenticate } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import {
  addFavoriteSchema,
  favoriteIdParamSchema,
} from "./favorites.validation.js";

const router = Router();

// Protect all favorites routes
router.use(authenticate);

router.get("/", FavoritesController.getFavorites);
router.get("/check", FavoritesController.checkFavorite);
router.post("/", validate(addFavoriteSchema), FavoritesController.addFavorite);
router.delete("/:id", validate(favoriteIdParamSchema), FavoritesController.removeFavorite);
router.delete("/", FavoritesController.removeFavorite);

export default router;
