import Joi from "joi";

export const savePaymentMethodSchema = {
  body: Joi.object({
    payment_method_id: Joi.string().optional(),
    paymentMethodId: Joi.string().optional(),
    is_default: Joi.boolean().default(false),
  }).or("payment_method_id", "paymentMethodId"),
};

export const paymentMethodIdParamSchema = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
};
