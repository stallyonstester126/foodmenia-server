import { db } from "../../database/connection.js";

export class FavoritesRepository {
  static async getFavoritesByUserId(userId, filterType = null) {
    let query = db("favorites as f")
      .where("f.user_id", userId)
      .leftJoin("restaurants as r", "f.restaurant_id", "r.id")
      .leftJoin("menu_items as mi", "f.menu_item_id", "mi.id")
      .leftJoin("restaurants as mi_r", "mi.restaurant_id", "mi_r.id")
      .select(
        "f.id",
        "f.user_id",
        "f.restaurant_id",
        "f.menu_item_id",
        "f.created_at",
        "r.id as r_id",
        "r.name as r_name",
        "r.type as r_type",
        "r.description as r_description",
        "r.cover_image_url as r_cover_image",
        "r.profile_image_url as r_profile_image",
        "r.address as r_address",
        "r.rating as r_rating",
        "r.rating_count as r_rating_count",
        "r.price_tier as r_price_tier",
        "r.delivery_time_min as r_delivery_min",
        "r.delivery_time_max as r_delivery_max",
        "r.is_active as r_is_active",
        "mi.id as mi_id",
        "mi.name as mi_name",
        "mi.description as mi_description",
        "mi.image_url as mi_image",
        "mi.base_price as mi_price",
        "mi.is_available as mi_is_available",
        "mi.restaurant_id as mi_restaurant_id",
        "mi_r.name as mi_restaurant_name"
      )
      .orderBy("f.created_at", "desc");

    if (filterType === "restaurant") {
      query = query.whereNotNull("f.restaurant_id").andWhere("r.type", "restaurant");
    } else if (filterType === "shop") {
      query = query.whereNotNull("f.restaurant_id").andWhere("r.type", "shop");
    } else if (filterType === "menu_item") {
      query = query.whereNotNull("f.menu_item_id");
    }

    const rows = await query;

    // Fetch cuisine tags for favorited restaurants
    const restaurantIds = rows.filter((row) => row.restaurant_id).map((row) => row.restaurant_id);
    let cuisinesMap = {};
    if (restaurantIds.length > 0) {
      const cuisines = await db("restaurant_cuisines as rc")
        .join("cuisines as c", "rc.cuisine_id", "c.id")
        .whereIn("rc.restaurant_id", restaurantIds)
        .select("rc.restaurant_id", "c.id", "c.name");

      cuisines.forEach((c) => {
        if (!cuisinesMap[c.restaurant_id]) cuisinesMap[c.restaurant_id] = [];
        cuisinesMap[c.restaurant_id].push({ id: c.id, name: c.name });
      });
    }

    return rows.map((row) => {
      const isRestaurant = Boolean(row.restaurant_id);

      return {
        id: row.id,
        user_id: row.user_id,
        restaurant_id: row.restaurant_id || null,
        menu_item_id: row.menu_item_id || null,
        type: isRestaurant ? (row.r_type || "restaurant") : "menu_item",
        created_at: row.created_at,
        restaurant: isRestaurant
          ? {
              id: row.r_id,
              name: row.r_name,
              type: row.r_type || "restaurant",
              description: row.r_description || null,
              cover_image_url: row.r_cover_image || null,
              profile_image_url: row.r_profile_image || null,
              address: row.r_address || null,
              rating: Number(row.r_rating || 4.5),
              rating_count: Number(row.r_rating_count || 0),
              price_tier: row.r_price_tier || "$$",
              delivery_time_min: row.r_delivery_min || 20,
              delivery_time_max: row.r_delivery_max || 35,
              is_active: Boolean(row.r_is_active),
              cuisines: cuisinesMap[row.r_id] || [],
            }
          : null,
        menu_item: row.menu_item_id
          ? {
              id: row.mi_id,
              name: row.mi_name,
              description: row.mi_description || null,
              image_url: row.mi_image || null,
              base_price: Number(row.mi_price || 0),
              is_available: Boolean(row.mi_is_available),
              restaurant_id: row.mi_restaurant_id,
              restaurant_name: row.mi_restaurant_name || "Restaurant",
            }
          : null,
      };
    });
  }

  static async getFavoriteById(id) {
    return db("favorites").where({ id }).first();
  }

  static async findExistingFavorite(userId, restaurantId = null, menuItemId = null) {
    let query = db("favorites").where({ user_id: userId });
    if (restaurantId) {
      query = query.andWhere({ restaurant_id: restaurantId });
    }
    if (menuItemId) {
      query = query.andWhere({ menu_item_id: menuItemId });
    }
    return query.first();
  }

  static async addFavorite(userId, { restaurant_id = null, menu_item_id = null }) {
    const [id] = await db("favorites").insert({
      user_id: userId,
      restaurant_id: restaurant_id || null,
      menu_item_id: menu_item_id || null,
    });
    return db("favorites").where({ id }).first();
  }

  static async removeFavorite(id, userId) {
    return db("favorites").where({ id, user_id: userId }).delete();
  }

  static async removeFavoriteByEntity(userId, restaurantId = null, menuItemId = null) {
    let query = db("favorites").where({ user_id: userId });
    if (restaurantId) {
      query = query.andWhere({ restaurant_id: restaurantId });
    }
    if (menuItemId) {
      query = query.andWhere({ menu_item_id: menuItemId });
    }
    return query.delete();
  }
}
