import { AuthService } from "./auth.service.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HTTP_STATUS } from "../../config/constants.js";

export class AuthController {
  static register = asyncHandler(async (req, res) => {
    const { name, email, password, phone, accountType } = req.body;
    const role = accountType === "restaurant_owner" ? "restaurant_owner" : "customer";
    const result = await AuthService.register(name, email, password, phone, role);
    return ApiResponse.success(
      res,
      result,
      "User registered successfully.",
      HTTP_STATUS.CREATED
    );
  });

  static login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    return ApiResponse.success(res, result, "Login successful.", HTTP_STATUS.OK);
  });

  static refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const tokens = await AuthService.refreshToken(refreshToken);
    return ApiResponse.success(res, tokens, "Token refreshed successfully.", HTTP_STATUS.OK);
  });

  static logout = asyncHandler(async (req, res) => {
    const refreshToken = req.body.refreshToken || null;
    const result = await AuthService.logout(refreshToken);
    return ApiResponse.success(res, null, result.message, HTTP_STATUS.OK);
  });

  static logoutAll = asyncHandler(async (req, res) => {
    const result = await AuthService.logoutAll(req.user.id);
    return ApiResponse.success(res, null, result.message, HTTP_STATUS.OK);
  });

  static sendVerificationOTP = asyncHandler(async (req, res) => {
    const identifier = req.user?.id || req.body?.email || req.body?.userId;
    const result = await AuthService.sendVerificationOTP(identifier);
    return ApiResponse.success(res, null, result.message, HTTP_STATUS.OK);
  });

  static verifyEmail = asyncHandler(async (req, res) => {
    const identifier = req.user?.id || req.body?.email || req.body?.userId;
    const otp = req.body?.otp || req.body?.otpCode || req.body?.code;
    const result = await AuthService.verifyEmail(identifier, otp);
    return ApiResponse.success(res, result, result.message, HTTP_STATUS.OK);
  });

  static forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await AuthService.forgotPassword(email);
    return ApiResponse.success(res, result, result.message, HTTP_STATUS.OK);
  });

  static resetPassword = asyncHandler(async (req, res) => {
    const tokenOrOtp = req.body.token || req.body.otp || req.body.otpCode || req.body.code;
    const { newPassword, email } = req.body;
    const result = await AuthService.resetPassword(tokenOrOtp, newPassword, email);
    return ApiResponse.success(res, null, result.message, HTTP_STATUS.OK);
  });

  static changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const result = await AuthService.changePassword(req.user.id, currentPassword, newPassword);
    return ApiResponse.success(res, result.tokens || null, result.message, HTTP_STATUS.OK);
  });
}
