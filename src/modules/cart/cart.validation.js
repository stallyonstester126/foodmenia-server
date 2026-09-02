import Joi from "joi";

export const addItemSchema = {
  body: Joi.object({
    menu_item_id: Joi.number().integer().positive().required().messages({
      "number.base": "Menu item ID is required",
    }),
    quantity: Joi.number().integer().min(1).max(50).default(1),
    addon_option_ids: Joi.array().items(Joi.number().integer().positive()).optional().default([]),
    special_instructions: Joi.string().max(500).allow("", null).optional(),
    unavailable_action: Joi.string().valid("remove", "substitute").default("remove"),
    clear_existing: Joi.boolean().default(false),
  }),
};

export const updateItemSchema = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
  body: Joi.object({
    quantity: Joi.number().integer().min(0).max(50).optional(),
    special_instructions: Joi.string().max(500).allow("", null).optional(),
  }).min(1),
};

export const cartItemIdParamSchema = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
};

export const switchFulfillmentSchema = {
  body: Joi.object({
    fulfillment_type: Joi.string().valid("delivery", "pickup").required().messages({
      "any.only": "Fulfillment type must be either 'delivery' or 'pickup'",
    }),
  }),
};
