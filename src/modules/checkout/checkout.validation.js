import Joi from "joi";

export const applyVoucherSchema = {
  body: Joi.object({
    code: Joi.string().trim().min(2).max(50).required().messages({
      "string.empty": "Voucher code is required",
    }),
  }),
};

export const addPaymentMethodSchema = {
  body: Joi.object({
    type: Joi.string().valid("card", "cod", "wallet").default("cod"),
    provider: Joi.string().max(50).allow("", null).optional(),
    last4: Joi.string().length(4).pattern(/^[0-9]+$/).allow("", null).optional(),
    is_default: Joi.boolean().default(false),
  }),
};

export const checkoutSummaryQuerySchema = {
  query: Joi.object({
    voucher_code: Joi.string().trim().max(50).optional().allow("", null),
  }),
};
