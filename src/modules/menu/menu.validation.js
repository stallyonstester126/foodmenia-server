import Joi from "joi";

export const getMenuSchema = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
  query: Joi.object({
    category: Joi.number().integer().positive().optional(),
  }),
};

export const menuItemIdParamSchema = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
};
