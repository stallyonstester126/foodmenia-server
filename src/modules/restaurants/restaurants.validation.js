import Joi from "joi";

export const listRestaurantsSchema = {
  query: Joi.object({
    cuisine: Joi.string().optional(),
    search: Joi.string().optional(),
    sort: Joi.string().valid("rating", "delivery_time", "name", "newest").default("newest"),
    type: Joi.string().valid("restaurant", "shop").optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
};

export const restaurantIdParamSchema = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
};
