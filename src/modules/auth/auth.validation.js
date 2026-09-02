import Joi from "joi";

export const registerSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      "string.empty": "Name is required",
      "string.min": "Name must be at least 2 characters",
    }),
    email: Joi.string().email().required().messages({
      "string.empty": "Email is required",
      "string.email": "Please provide a valid email address",
    }),
    password: Joi.string().min(6).max(128).required().messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least 6 characters",
    }),
    phone: Joi.string().allow(null, "").optional(),
    accountType: Joi.string().valid("customer", "restaurant_owner").optional().default("customer"),
  }),
};

export const loginSchema = {
  body: Joi.object({
    email: Joi.string().email().required().messages({
      "string.empty": "Email is required",
      "string.email": "Please provide a valid email address",
    }),
    password: Joi.string().required().messages({
      "string.empty": "Password is required",
    }),
  }),
};

export const refreshTokenSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required().messages({
      "string.empty": "Refresh token is required",
    }),
  }),
};

export const sendVerificationOtpSchema = {
  body: Joi.object({
    email: Joi.string().email().optional(),
    userId: Joi.number().optional(),
  }),
};

export const verifyEmailSchema = {
  body: Joi.object({
    email: Joi.string().email().optional(),
    userId: Joi.number().optional(),
    otp: Joi.string().min(4).max(10).required().messages({
      "string.empty": "Verification OTP code is required",
    }),
  }),
};

export const forgotPasswordSchema = {
  body: Joi.object({
    email: Joi.string().email().required().messages({
      "string.empty": "Email is required",
      "string.email": "Please provide a valid email address",
    }),
  }),
};

export const resetPasswordSchema = {
  body: Joi.object({
    token: Joi.string().optional(),
    otp: Joi.string().optional(),
    code: Joi.string().optional(),
    email: Joi.string().email().optional(),
    newPassword: Joi.string().min(6).max(128).required().messages({
      "string.empty": "New password is required",
      "string.min": "New password must be at least 6 characters",
    }),
  }).or("token", "otp", "code"),
};

export const changePasswordSchema = {
  body: Joi.object({
    currentPassword: Joi.string().required().messages({
      "string.empty": "Current password is required",
    }),
    newPassword: Joi.string().min(6).max(128).required().messages({
      "string.empty": "New password is required",
      "string.min": "New password must be at least 6 characters",
    }),
  }),
};
