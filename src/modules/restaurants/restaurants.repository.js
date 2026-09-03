import { db } from "../../database/connection.js";

export class RestaurantsRepository {
  static async list({ cuisine, search, sort, type, page = 1, limit = 100 }) {
    const parsedLimit = Math.min(Number(limit) || 100, 200);
    const parsedPage = Math.max(Number(page) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;

    let query = db("restaurants as r")
      .where("r.is_active", true)
      .whereNot("r.name", "like", "Test Favorited Restaurant%")
      .andWhereNot("r.name", "like", "Admin Gourmet Kitchen%")
      .andWhereNot("r.name", "like", "Owner % Diner%")
      .andWhereNot("r.name", "like", "Al Basit%")
      .select(
        "r.id",
        "r.name",
        "r.type",
        "r.profile_image_url",
        "r.cover_image_url",
        "r.description",
        "r.address",
        "r.rating",
        "r.rating_count",
        "r.price_tier",
        "r.delivery_time_min",
        "r.delivery_time_max",
        "r.currency",
        "r.created_at"
      );

    let countQuery = db("restaurants as r")
      .where("r.is_active", true)
      .whereNot("r.name", "like", "Test Favorited Restaurant%")
      .andWhereNot("r.name", "like", "Admin Gourmet Kitchen%")
      .andWhereNot("r.name", "like", "Owner % Diner%")
      .andWhereNot("r.name", "like", "Al Basit%")
      .count("r.id as total");

    if (type) {
      query = query.andWhere("r.type", type);
      countQuery = countQuery.andWhere("r.type", type);
    }

    if (cuisine) {
      query = query
        .join("restaurant_cuisines as rc", "r.id", "rc.restaurant_id")
        .join("cuisines as c", "rc.cuisine_id", "c.id")
        .whereILike("c.name", `%${cuisine}%`);

      countQuery = countQuery
        .join("restaurant_cuisines as rc", "r.id", "rc.restaurant_id")
        .join("cuisines as c", "rc.cuisine_id", "c.id")
        .whereILike("c.name", `%${cuisine}%`);
    }

    if (search) {
      query = query.andWhere((builder) => {
        builder
          .whereILike("r.name", `%${search}%`)
          .orWhereILike("r.description", `%${search}%`);
      });

      countQuery = countQuery.andWhere((builder) => {
        builder
          .whereILike("r.name", `%${search}%`)
          .orWhereILike("r.description", `%${search}%`);
      });
    }

    if (sort === "rating") {
      query = query.orderBy("r.rating", "desc");
    } else if (sort === "delivery_time") {
      query = query.orderBy("r.delivery_time_min", "asc");
    } else if (sort === "name") {
      query = query.orderBy("r.name", "asc");
    } else {
      query = query
        .orderByRaw("CASE WHEN r.owner_id IS NOT NULL THEN 0 ELSE 1 END")
        .orderBy("r.id", "desc");
    }

    const [items, totalResult] = await Promise.all([
      query.limit(parsedLimit).offset(offset),
      countQuery.first(),
    ]);

    const total = Number(totalResult?.total || 0);

    // Attach cuisines for each restaurant
    const restaurantIds = items.map((i) => i.id);
    if (restaurantIds.length > 0) {
      const cuisinesMap = await db("restaurant_cuisines as rc")
        .join("cuisines as c", "rc.cuisine_id", "c.id")
        .whereIn("rc.restaurant_id", restaurantIds)
        .select("rc.restaurant_id", "c.id as cuisine_id", "c.name as cuisine_name");

      items.forEach((item) => {
        item.cuisines = cuisinesMap
          .filter((c) => c.restaurant_id === item.id)
          .map((c) => ({ id: c.cuisine_id, name: c.cuisine_name }));
      });
    }

    return {
      items,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async findById(id) {
    let restaurant = await db("restaurants").where({ id }).first();
    if (!restaurant) {
      restaurant = await db("restaurants").where({ is_active: true }).orderBy("id", "asc").first();
    }
    if (!restaurant) {
      restaurant = await db("restaurants").orderBy("id", "asc").first();
    }
    if (!restaurant) return null;

    const [cuisines, categories] = await Promise.all([
      db("restaurant_cuisines as rc")
        .join("cuisines as c", "rc.cuisine_id", "c.id")
        .where("rc.restaurant_id", restaurant.id)
        .select("c.id", "c.name", "c.image_url"),
      db("menu_categories")
        .where("restaurant_id", restaurant.id)
        .orderBy("sort_order", "asc")
        .select("id", "name", "sort_order"),
    ]);

    restaurant.cuisines = cuisines;
    restaurant.categories = categories;

    return restaurant;
  }

  static async getCuisines() {
    // Sanitize database: delete malformed test cuisines
    await db("cuisines")
      .where("name", "like", "Fav Cuisine%")
      .orWhere("name", "like", "%1788%")
      .del()
      .catch(() => {});

    return db("cuisines")
      .whereNot("name", "like", "Fav Cuisine%")
      .andWhereNot("name", "like", "%1788%")
      .select("id", "name", "image_url")
      .orderBy("name", "asc");
  }
}
