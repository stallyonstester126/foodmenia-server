import { Router } from "express";
import { authenticate } from "../../middlewares/auth.js";
import {
  uploadSingleImage,
  validateImageSignature,
  uploadRateLimiter,
} from "./uploads.middleware.js";
import { UploadsController } from "./uploads.controller.js";

const router = Router();

// POST /api/v1/uploads/image - Upload image to Cloudinary
router.post(
  "/image",
  uploadRateLimiter,
  authenticate,
  (req, res, next) => {
    uploadSingleImage(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "File upload validation error.",
        });
      }
      next();
    });
  },
  validateImageSignature,
  UploadsController.uploadImage
);

// DELETE /api/v1/uploads/image - Delete image from Cloudinary
router.delete("/image", authenticate, UploadsController.deleteImage);

export default router;
