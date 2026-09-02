import { db } from "../../database/connection.js";

export class MenuRepository {
  static async getMenuByRestaurant(restaurantId, categoryId = null) {
    let query = db("menu_items as mi")
      .join("menu_categories as mc", "mi.category_id", "mc.id")
      .where("mi.restaurant_id", restaurantId)
      .andWhere("mi.is_available", true)
      .select(
        "mi.id",
        "mi.restaurant_id",
        "mi.category_id",
        "mc.name as category_name",
        "mi.name",
        "mi.description",
        "mi.image_url",
        "mi.base_price",
        "mi.sort_order"
      )
      .orderBy("mc.sort_order", "asc")
      .orderBy("mi.sort_order", "asc");

    if (categoryId) {
      query = query.andWhere("mi.category_id", categoryId);
    }

    return query;
  }

  static async getItemById(itemId) {
    const item = await db("menu_items as mi")
      .join("restaurants as r", "mi.restaurant_id", "r.id")
      .join("menu_categories as mc", "mi.category_id", "mc.id")
      .where("mi.id", itemId)
      .select(
        "mi.id",
        "mi.restaurant_id",
        "r.name as restaurant_name",
        "mi.category_id",
        "mc.name as category_name",
        "mi.name",
        "mi.description",
        "mi.image_url",
        "mi.base_price",
        "mi.is_available"
      )
      .first();

    if (!item) return null;

    // Fetch addon groups
    const addonGroups = await db("item_addon_groups")
      .where("menu_item_id", itemId)
      .select("id", "name", "selection_type", "is_required");

    const groupIds = addonGroups.map((g) => g.id);
    if (groupIds.length > 0) {
      const options = await db("item_addon_options")
        .whereIn("addon_group_id", groupIds)
        .select("id", "addon_group_id", "name", "extra_price");

      addonGroups.forEach((group) => {
        group.options = options.filter((o) => o.addon_group_id === group.id);
      });
    }

    // Fetch Frequently Bought Together (related_items)
    let relatedItems = await db("related_items as ri")
      .join("menu_items as mi", "ri.related_item_id", "mi.id")
      .where("ri.menu_item_id", itemId)
      .andWhere("mi.is_available", true)
      .select(
        "mi.id",
        "mi.name",
        "mi.description",
        "mi.image_url",
        "mi.base_price"
      )
      .orderBy("ri.sort_order", "asc");

    // Professional Recommendation Algorithm: If no specific related_items curated, suggest top items from same restaurant
    if (!relatedItems || relatedItems.length === 0) {
      relatedItems = await db("menu_items")
        .where("restaurant_id", item.restaurant_id)
        .andWhereNot("id", itemId)
        .andWhere("is_available", true)
        .select("id", "name", "description", "image_url", "base_price")
        .limit(6);
    }

    item.addon_groups = addonGroups;
    item.frequently_bought_together = relatedItems;

    return item;
  }
}
