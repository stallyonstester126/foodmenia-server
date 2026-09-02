import Joi from "joi";

export const updateProfileSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().allow(null, "").optional(),
    avatar_url: Joi.string().uri().allow(null, "").optional(),
  }).min(1).messages({
    "object.min": "At least one field must be provided to update profile",
  }),
};

export const createAddressSchema = {
  body: Joi.object({
    label: Joi.string().valid("Home", "Work", "Other").default("Home"),
    full_address: Joi.string().min(5).max(500).required().messages({
      "string.empty": "Full address is required",
      "string.min": "Address must be at least 5 characters",
    }),
    lat: Joi.number().min(-90).max(90).optional().allow(null),
    lng: Joi.number().min(-180).max(180).optional().allow(null),
    city: Joi.string().max(100).optional().allow(null, ""),
    country: Joi.string().max(100).optional().allow(null, ""),
    is_default: Joi.boolean().optional(),
  }),
};

export const updateAddressSchema = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
  body: Joi.object({
    label: Joi.string().valid("Home", "Work", "Other").optional(),
    full_address: Joi.string().min(5).max(500).optional(),
    lat: Joi.number().min(-90).max(90).optional().allow(null),
    lng: Joi.number().min(-180).max(180).optional().allow(null),
    city: Joi.string().max(100).optional().allow(null, ""),
    country: Joi.string().max(100).optional().allow(null, ""),
    is_default: Joi.boolean().optional(),
  }).min(1),
};

export const addressIdParamSchema = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
};
