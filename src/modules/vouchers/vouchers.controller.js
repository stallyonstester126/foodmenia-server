import { VouchersService } from "./vouchers.service.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HTTP_STATUS } from "../../config/constants.js";

export class VouchersController {
  static getAvailableVouchers = asyncHandler(async (req, res) => {
    const vouchers = await VouchersService.getAvailableVouchers(req.user.id);
    return ApiResponse.success(res, vouchers, "Active vouchers retrieved successfully.", HTTP_STATUS.OK);
  });
}
