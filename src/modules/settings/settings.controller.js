import { SettingsService } from "./settings.service.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HTTP_STATUS } from "../../config/constants.js";

export class SettingsController {
  static getSettings = asyncHandler(async (req, res) => {
    const settings = await SettingsService.getSettings(req.user.id);
    return ApiResponse.success(res, settings, "User settings retrieved successfully.", HTTP_STATUS.OK);
  });

  static updateSettings = asyncHandler(async (req, res) => {
    const updatedSettings = await SettingsService.updateSettings(req.user.id, req.body);
    return ApiResponse.success(res, updatedSettings, "User settings updated successfully.", HTTP_STATUS.OK);
  });
}
