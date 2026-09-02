import { CheckoutService } from "./checkout.service.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HTTP_STATUS } from "../../config/constants.js";

export class CheckoutController {
  static getSummary = asyncHandler(async (req, res) => {
    const voucherCode = req.query.voucher_code || null;
    const summary = await CheckoutService.getCheckoutSummary(req.user.id, voucherCode);
    return ApiResponse.success(res, summary, "Checkout summary calculated successfully.", HTTP_STATUS.OK);
  });

  static applyVoucher = asyncHandler(async (req, res) => {
    const { code } = req.body;
    const result = await CheckoutService.applyVoucher(req.user.id, code);
    return ApiResponse.success(res, result.summary, result.message, HTTP_STATUS.OK);
  });

  static removeVoucher = asyncHandler(async (req, res) => {
    const summary = await CheckoutService.getCheckoutSummary(req.user.id, null);
    return ApiResponse.success(res, summary, "Voucher removed.", HTTP_STATUS.OK);
  });

  // Payment Methods
  static getPaymentMethods = asyncHandler(async (req, res) => {
    const methods = await CheckoutService.getPaymentMethods(req.user.id);
    return ApiResponse.success(res, methods, "Payment methods retrieved successfully.", HTTP_STATUS.OK);
  });

  static addPaymentMethod = asyncHandler(async (req, res) => {
    const method = await CheckoutService.addPaymentMethod(req.user.id, req.body);
    return ApiResponse.success(res, method, "Payment method added successfully.", HTTP_STATUS.CREATED);
  });

  static deletePaymentMethod = asyncHandler(async (req, res) => {
    const methodId = Number(req.params.id);
    const result = await CheckoutService.deletePaymentMethod(req.user.id, methodId);
    return ApiResponse.success(res, null, result.message, HTTP_STATUS.OK);
  });
}
