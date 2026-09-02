import Joi from "joi";

export const createRestaurantSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    cover_image_url: Joi.string().uri().allow("", null).optional(),
    description: Joi.string().allow("", null).optional(),
    address: Joi.string().allow("", null).optional(),
    lat: Joi.number().allow(null).optional(),
    lng: Joi.number().allow(null).optional(),
    price_tier: Joi.string().valid("$", "$$", "$$$").default("$$"),
    delivery_time_min: Joi.number().integer().min(5).default(20),
    delivery_time_max: Joi.number().integer().min(10).default(35),
    is_active: Joi.boolean().default(true),
    cuisine_ids: Joi.array().items(Joi.number().integer().positive()).optional(),
  }),
};

export const createMenuItemSchema = {
  body: Joi.object({
    category_id: Joi.number().integer().positive().optional(),
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().allow("", null).optional(),
    image_url: Joi.string().allow("", null).optional(),
    base_price: Joi.number().positive().precision(2).required(),
    is_available: Joi.boolean().truthy(1, "1", "true").falsy(0, "0", "false").default(true),
    sort_order: Joi.number().integer().default(0),
  }),
};

export const createVoucherSchema = {
  body: Joi.object({
    code: Joi.string().min(2).max(50).required(),
    discount_type: Joi.string().valid("percent", "flat", "free_delivery").required(),
    discount_value: Joi.number().positive().precision(2).required(),
    min_order_amount: Joi.number().min(0).default(0.00),
    max_discount_amount: Joi.number().positive().allow(null).optional(),
    valid_from: Joi.date().optional(),
    valid_until: Joi.date().optional(),
    usage_limit: Joi.number().integer().min(1).default(1000),
    per_user_limit: Joi.number().integer().min(1).default(1),
    is_active: Joi.boolean().default(true),
  }),
};

export const updateOrderStatusSchema = {
  body: Joi.object({
    status: Joi.string().valid("placed", "preparing", "ready", "delivering", "delivered", "cancelled").required(),
  }),
};

export const refundOrderSchema = {
  body: Joi.object({
    amount: Joi.number().positive().optional(),
    reason: Joi.string().max(255).default("Admin manual refund"),
  }),
};

export const updateUserRoleSchema = {
  body: Joi.object({
    role: Joi.string().valid("customer", "admin", "restaurant_owner").required(),
  }),
};
