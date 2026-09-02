import Joi from "joi";

export const onboardRestaurantSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      "string.empty": "Restaurant name is required",
    }),
    description: Joi.string().max(500).allow(null, "").optional(),
    type: Joi.string().valid("restaurant", "shop").optional(),
    profileImageUrl: Joi.string().allow(null, "").optional(),
    profile_image_url: Joi.string().allow(null, "").optional(),
    coverImageUrl: Joi.string().allow(null, "").optional(),
    cover_image_url: Joi.string().allow(null, "").optional(),
    address: Joi.string().max(255).allow(null, "").optional(),
    lat: Joi.number().min(-90).max(90).allow(null).optional(),
    lng: Joi.number().min(-180).max(180).allow(null).optional(),
    priceTier: Joi.string().valid("$", "$$", "$$$", "$$$$").optional(),
    price_tier: Joi.string().valid("$", "$$", "$$$", "$$$$").optional(),
    deliveryTimeMin: Joi.number().integer().min(1).max(240).optional(),
    delivery_time_min: Joi.number().integer().min(1).max(240).optional(),
    deliveryTimeMax: Joi.number().integer().min(1).max(240).optional(),
    delivery_time_max: Joi.number().integer().min(1).max(240).optional(),
    cuisineIds: Joi.array().items(Joi.number().integer().positive()).optional(),
    cuisine_ids: Joi.array().items(Joi.number().integer().positive()).optional(),
  }),
};

export const updateRestaurantSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).allow(null, "").optional(),
    type: Joi.string().valid("restaurant", "shop").optional(),
    profileImageUrl: Joi.string().allow(null, "").optional(),
    profile_image_url: Joi.string().allow(null, "").optional(),
    coverImageUrl: Joi.string().allow(null, "").optional(),
    cover_image_url: Joi.string().allow(null, "").optional(),
    address: Joi.string().max(255).allow(null, "").optional(),
    lat: Joi.number().min(-90).max(90).allow(null).optional(),
    lng: Joi.number().min(-180).max(180).allow(null).optional(),
    priceTier: Joi.string().valid("$", "$$", "$$$", "$$$$").optional(),
    price_tier: Joi.string().valid("$", "$$", "$$$", "$$$$").optional(),
    deliveryTimeMin: Joi.number().integer().min(1).max(240).optional(),
    delivery_time_min: Joi.number().integer().min(1).max(240).optional(),
    deliveryTimeMax: Joi.number().integer().min(1).max(240).optional(),
    delivery_time_max: Joi.number().integer().min(1).max(240).optional(),
    cuisineIds: Joi.array().items(Joi.number().integer().positive()).optional(),
    cuisine_ids: Joi.array().items(Joi.number().integer().positive()).optional(),
  }),
};

export const createCategorySchema = {
  body: Joi.object({
    name: Joi.string().min(1).max(100).required().messages({
      "string.empty": "Category name is required",
    }),
    sort_order: Joi.number().integer().min(0).optional(),
  }),
};

export const updateCategorySchema = {
  body: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    sort_order: Joi.number().integer().min(0).optional(),
  }),
};

const addonGroupSchema = Joi.object({
  id: Joi.number().integer().positive().optional(),
  name: Joi.string().min(1).max(100).allow(null, "").optional(),
  title: Joi.string().min(1).max(100).allow(null, "").optional(),
  selection_type: Joi.string().valid("single", "multiple").default("single"),
  selectionType: Joi.string().valid("single", "multiple").default("single"),
  is_required: Joi.boolean().default(false),
  isRequired: Joi.boolean().default(false),
  options: Joi.array().items(
    Joi.object({
      id: Joi.number().integer().positive().optional(),
      name: Joi.string().min(1).max(100).required(),
      extra_price: Joi.number().min(0).allow(null).optional(),
      price: Joi.number().min(0).allow(null).optional(),
    })
  ).optional(),
});

export const createMenuItemSchema = {
  body: Joi.object({
    name: Joi.string().min(1).max(100).required().messages({
      "string.empty": "Item name is required",
    }),
    category_id: Joi.number().integer().positive().allow(null).optional(),
    categoryId: Joi.number().integer().positive().allow(null).optional(),
    description: Joi.string().max(2000).allow(null, "").optional(),
    image_url: Joi.string().allow(null, "").optional(),
    imageUrl: Joi.string().allow(null, "").optional(),
    base_price: Joi.number().min(0).optional(),
    price: Joi.number().min(0).optional(),
    is_available: Joi.boolean().truthy(1, "1", "true").falsy(0, "0", "false").optional(),
    sort_order: Joi.number().integer().min(0).optional(),
    addon_groups: Joi.array().items(addonGroupSchema).optional(),
    related_item_ids: Joi.array().items(Joi.number().integer().positive()).optional(),
  }),
};

export const updateMenuItemSchema = {
  body: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    category_id: Joi.number().integer().positive().allow(null).optional(),
    categoryId: Joi.number().integer().positive().allow(null).optional(),
    description: Joi.string().max(2000).allow(null, "").optional(),
    image_url: Joi.string().allow(null, "").optional(),
    imageUrl: Joi.string().allow(null, "").optional(),
    base_price: Joi.number().min(0).optional(),
    price: Joi.number().min(0).optional(),
    is_available: Joi.boolean().truthy(1, "1", "true").falsy(0, "0", "false").optional(),
    sort_order: Joi.number().integer().min(0).optional(),
    addon_groups: Joi.array().items(addonGroupSchema).optional(),
    related_item_ids: Joi.array().items(Joi.number().integer().positive()).optional(),
  }),
};

export const updateOrderStatusSchema = {
  body: Joi.object({
    status: Joi.string()
      .valid("placed", "confirmed", "preparing", "ready", "delivering", "delivered", "cancelled")
      .required(),
  }),
};
