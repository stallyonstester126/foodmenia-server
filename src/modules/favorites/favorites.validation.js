import Joi from "joi";

export const addFavoriteSchema = {
  body: Joi.object({
    restaurant_id: Joi.number().integer().positive().optional().allow(null),
    restaurantId: Joi.number().integer().positive().optional().allow(null),
    menu_item_id: Joi.number().integer().positive().optional().allow(null),
    menuItemId: Joi.number().integer().positive().optional().allow(null),
    targetId: Joi.number().integer().positive().optional().allow(null),
    type: Joi.string().valid("restaurant", "shop", "menu_item").optional().allow(null),
  })
    .or("restaurant_id", "restaurantId", "menu_item_id", "menuItemId", "targetId")
    .messages({
      "object.missing": "Either restaurantId or menuItemId must be provided.",
    }),
};

export const favoriteIdParamSchema = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
};
