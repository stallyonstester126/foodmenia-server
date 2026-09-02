import Joi from "joi";

export const placeOrderSchema = {
  body: Joi.object({
    address_id: Joi.alternatives().try(Joi.number(), Joi.string()).optional().allow(null),
    addressId: Joi.alternatives().try(Joi.number(), Joi.string()).optional().allow(null),
    payment_method_id: Joi.alternatives().try(Joi.number(), Joi.string()).optional().allow(null),
    paymentMethodId: Joi.alternatives().try(Joi.number(), Joi.string()).optional().allow(null),
    voucher_code: Joi.string().trim().max(50).optional().allow("", null),
    delivery_instructions: Joi.string().max(500).optional().allow("", null),
    fulfillment_type: Joi.string().optional().allow("", null),
    fulfillmentType: Joi.string().optional().allow("", null),
  }),
};

export const orderIdParamSchema = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
};

export const listOrdersQuerySchema = {
  query: Joi.object({
    status: Joi.string().valid("current", "past", "all").default("all"),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
  }),
};

export const cancelOrderSchema = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
  body: Joi.object({
    reason: Joi.string().max(300).default("Cancelled by user"),
  }),
};

export const sendMessageSchema = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
  body: Joi.object({
    message: Joi.string().trim().min(1).max(1000).required().messages({
      "string.empty": "Message text cannot be empty",
    }),
  }),
};
