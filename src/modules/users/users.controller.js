import { UsersService } from "./users.service.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HTTP_STATUS } from "../../config/constants.js";

export class UsersController {
  static getProfile = asyncHandler(async (req, res) => {
    const user = await UsersService.getProfile(req.user.id);
    return ApiResponse.success(res, user, "User profile retrieved successfully.", HTTP_STATUS.OK);
  });

  static updateProfile = asyncHandler(async (req, res) => {
    const updatedUser = await UsersService.updateProfile(req.user.id, req.body);
    return ApiResponse.success(res, updatedUser, "Profile updated successfully.", HTTP_STATUS.OK);
  });

  // Addresses
  static getAddresses = asyncHandler(async (req, res) => {
    const addresses = await UsersService.getAddresses(req.user.id);
    return ApiResponse.success(res, addresses, "Addresses retrieved successfully.", HTTP_STATUS.OK);
  });

  static addAddress = asyncHandler(async (req, res) => {
    const newAddress = await UsersService.addAddress(req.user.id, req.body);
    return ApiResponse.success(res, newAddress, "Address created successfully.", HTTP_STATUS.CREATED);
  });

  static updateAddress = asyncHandler(async (req, res) => {
    const addressId = Number(req.params.id);
    const updatedAddress = await UsersService.updateAddress(addressId, req.user.id, req.body);
    return ApiResponse.success(res, updatedAddress, "Address updated successfully.", HTTP_STATUS.OK);
  });

  static deleteAddress = asyncHandler(async (req, res) => {
    const addressId = Number(req.params.id);
    const result = await UsersService.deleteAddress(addressId, req.user.id);
    return ApiResponse.success(res, null, result.message, HTTP_STATUS.OK);
  });

  static setDefaultAddress = asyncHandler(async (req, res) => {
    const addressId = Number(req.params.id);
    const updatedAddress = await UsersService.setDefaultAddress(addressId, req.user.id);
    return ApiResponse.success(res, updatedAddress, "Default address set successfully.", HTTP_STATUS.OK);
  });
}
