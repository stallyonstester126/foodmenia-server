import Joi from "joi";

export const updateSettingsSchema = {
  body: Joi.object({
    language: Joi.string().valid("English", "Spanish", "French", "German", "Urdu", "Arabic", "Tagalog").optional(),
    push_notifications: Joi.boolean().optional(),
    email_offers: Joi.boolean().optional(),
    show_tracking_cost: Joi.boolean().optional(),
  }).min(1).messages({
    "object.min": "At least one setting must be provided to update",
  }),
};
