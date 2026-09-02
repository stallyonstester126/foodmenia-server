import { Router } from "express";
import { UsersController } from "./users.controller.js";
import { authenticate } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import {
  updateProfileSchema,
  createAddressSchema,
  updateAddressSchema,
  addressIdParamSchema,
} from "./users.validation.js";

const router = Router();

// Protect all user routes
router.use(authenticate);

// Profile
router.get("/me", UsersController.getProfile);
router.patch("/me", validate(updateProfileSchema), UsersController.updateProfile);

// Addresses
router.get("/addresses", UsersController.getAddresses);
router.post("/addresses", validate(createAddressSchema), UsersController.addAddress);
router.patch("/addresses/:id", validate(updateAddressSchema), UsersController.updateAddress);
router.delete("/addresses/:id", validate(addressIdParamSchema), UsersController.deleteAddress);
router.patch("/addresses/:id/default", validate(addressIdParamSchema), UsersController.setDefaultAddress);

export default router;
