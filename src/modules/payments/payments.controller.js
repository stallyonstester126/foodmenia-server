import { PaymentsService } from "./payments.service.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HTTP_STATUS } from "../../config/constants.js";

export class PaymentsController {
  static createSetupIntent = asyncHandler(async (req, res) => {
    const result = await PaymentsService.createSetupIntent(req.user.id);
    return ApiResponse.success(res, result, "SetupIntent created successfully.", HTTP_STATUS.CREATED);
  });

  static savePaymentMethod = asyncHandler(async (req, res) => {
    const paymentMethodId = req.body.payment_method_id || req.body.paymentMethodId;
    const isDefault = req.body.is_default || false;
    const method = await PaymentsService.savePaymentMethod(req.user.id, paymentMethodId, isDefault);
    return ApiResponse.success(res, method, "Payment method saved successfully.", HTTP_STATUS.CREATED);
  });

  static listPaymentMethods = asyncHandler(async (req, res) => {
    const methods = await PaymentsService.listPaymentMethods(req.user.id);
    return ApiResponse.success(res, methods, "Payment methods retrieved successfully.", HTTP_STATUS.OK);
  });

  static deletePaymentMethod = asyncHandler(async (req, res) => {
    const methodId = Number(req.params.id);
    const result = await PaymentsService.deletePaymentMethod(req.user.id, methodId);
    return ApiResponse.success(res, null, result.message, HTTP_STATUS.OK);
  });

  static webhook = asyncHandler(async (req, res) => {
    const signature = req.headers["stripe-signature"];
    const result = await PaymentsService.handleWebhook(req.body, signature);
    return res.status(200).json(result);
  });
}
