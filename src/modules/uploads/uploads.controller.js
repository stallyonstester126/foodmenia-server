import { UploadsService } from "./uploads.service.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { HTTP_STATUS } from "../../config/constants.js";

export class UploadsController {
  static async uploadImage(req, res, next) {
    try {
      if (!req.file) {
        return ApiResponse.error(res, "Please provide an image file in the 'image' field.", HTTP_STATUS.BAD_REQUEST);
      }

      const purpose = req.body?.purpose || req.query?.purpose || "general";
      const userId = req.user?.id || "anonymous";

      const result = await UploadsService.uploadImage(req.file.buffer, {
        purpose,
        userId,
        mimeType: req.file.mimetype,
      });

      return ApiResponse.success(res, result, "Image uploaded successfully.", HTTP_STATUS.CREATED);
    } catch (error) {
      next(error);
    }
  }

  static async deleteImage(req, res, next) {
    try {
      const { publicId } = req.body;
      if (!publicId) {
        return ApiResponse.error(res, "publicId is required in request body.", HTTP_STATUS.BAD_REQUEST);
      }

      await UploadsService.deleteImage(publicId);

      return ApiResponse.success(res, { publicId }, "Image deleted successfully.", HTTP_STATUS.OK);
    } catch (error) {
      next(error);
    }
  }
}
