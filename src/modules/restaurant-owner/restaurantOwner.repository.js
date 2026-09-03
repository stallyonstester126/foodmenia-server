import { db } from "../../database/connection.js";

export class RestaurantOwnerRepository {
  static async findRestaurantByOwnerId(ownerId) {
    const restaurant = await db("restaurants").where({ owner_id: ownerId }).first();
    if (!restaurant) return null;

    const cuisines = await db("restaurant_cuisines as rc")
      .join("cuisines as c", "rc.cuisine_id", "c.id")
      .where("rc.restaurant_id", restaurant.id)
      .whereNot("c.name", "like", "Fav Cuisine%")
      .andWhereNot("c.name", "like", "%1788%")
      .select("c.id", "c.name");

    return {
      ...restaurant,
      is_active: Boolean(restaurant.is_active),
      cuisines,
    };
  }

  static async createRestaurant(ownerId, data) {
    const [id] = await db("restaurants").insert({
      owner_id: ownerId,
      name: data.name,
      type: data.type || "restaurant",
      profile_image_url: data.profileImageUrl || data.profile_image_url || null,
      cover_image_url: data.coverImageUrl || data.cover_image_url || null,
      description: data.description || null,
      address: data.address || null,
      lat: data.lat || null,
      lng: data.lng || null,
      price_tier: data.priceTier || data.price_tier || "$$",
      currency: data.currency || "USD ($)",
      delivery_time_min: data.deliveryTimeMin || data.delivery_time_min || 20,
      delivery_time_max: data.deliveryTimeMax || data.delivery_time_max || 35,
      is_active: false, // Must be false until approved by an admin
    });

    const rawCuisines = data.cuisineIds || data.cuisine_ids || data.cuisines;
    if (rawCuisines && Array.isArray(rawCuisines)) {
      await this.resolveAndLinkCuisines(id, rawCuisines);
    }

    return this.findRestaurantByOwnerId(ownerId);
  }

  static async resolveAndLinkCuisines(restaurantId, rawCuisines) {
    if (!rawCuisines || !Array.isArray(rawCuisines)) return;

    await db("restaurant_cuisines").where({ restaurant_id: restaurantId }).delete();

    if (rawCuisines.length === 0) return;

    const numericIds = [];
    const nameLookups = [];

    for (const item of rawCuisines) {
      if (typeof item === "number") {
        numericIds.push(item);
      } else if (typeof item === "string") {
        const parsed = Number(item);
        if (!isNaN(parsed) && parsed > 0) {
          numericIds.push(parsed);
        } else if (item.trim()) {
          nameLookups.push(item.trim());
        }
      } else if (item && typeof item === "object") {
        const objId = Number(item.id || item.cuisine_id);
        if (!isNaN(objId) && objId > 0) {
          numericIds.push(objId);
        } else if (item.name && typeof item.name === "string") {
          nameLookups.push(item.name.trim());
        }
      }
    }

    const foundCuisines = await db("cuisines")
      .where(function () {
        if (numericIds.length > 0) {
          this.whereIn("id", numericIds);
        }
        if (nameLookups.length > 0) {
          this.orWhereIn("name", nameLookups);
        }
      })
      .select("id");

    const distinctIds = [...new Set(foundCuisines.map((c) => c.id))];
    if (distinctIds.length > 0) {
      const links = distinctIds.map((cid) => ({
        restaurant_id: restaurantId,
        cuisine_id: cid,
      }));
      await db("restaurant_cuisines").insert(links);
    }
  }

  static async updateRestaurant(ownerId, data) {
    const restaurant = await db("restaurants").where({ owner_id: ownerId }).first();
    if (!restaurant) return null;

    const updatePayload = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.type !== undefined) updatePayload.type = data.type;
    if (data.profileImageUrl !== undefined) updatePayload.profile_image_url = data.profileImageUrl;
    if (data.profile_image_url !== undefined) updatePayload.profile_image_url = data.profile_image_url;
    if (data.coverImageUrl !== undefined) updatePayload.cover_image_url = data.coverImageUrl;
    if (data.cover_image_url !== undefined) updatePayload.cover_image_url = data.cover_image_url;
    if (data.address !== undefined) updatePayload.address = data.address;
    if (data.lat !== undefined) updatePayload.lat = data.lat;
    if (data.lng !== undefined) updatePayload.lng = data.lng;
    if (data.priceTier !== undefined) updatePayload.price_tier = data.priceTier;
    if (data.price_tier !== undefined) updatePayload.price_tier = data.price_tier;
    if (data.currency !== undefined) updatePayload.currency = data.currency;
    if (data.deliveryTimeMin !== undefined) updatePayload.delivery_time_min = data.deliveryTimeMin;
    if (data.deliveryTimeMax !== undefined) updatePayload.delivery_time_max = data.deliveryTimeMax;

    if (Object.keys(updatePayload).length > 0) {
      await db("restaurants").where({ id: restaurant.id }).update(updatePayload);
    }

    const rawCuisines = data.cuisineIds || data.cuisine_ids || data.cuisines;
    if (rawCuisines && Array.isArray(rawCuisines)) {
      await this.resolveAndLinkCuisines(restaurant.id, rawCuisines);
    }

    return this.findRestaurantByOwnerId(ownerId);
  }

  // --- Menu Categories ---
  static async getCategories(restaurantId) {
    return db("menu_categories")
      .where({ restaurant_id: restaurantId })
      .orderBy("sort_order", "asc");
  }

  static async createCategory(restaurantId, name, sortOrder = 0) {
    const [id] = await db("menu_categories").insert({
      restaurant_id: restaurantId,
      name,
      sort_order: sortOrder,
    });
    return db("menu_categories").where({ id }).first();
  }

  static async updateCategory(categoryId, restaurantId, data) {
    await db("menu_categories")
      .where({ id: categoryId, restaurant_id: restaurantId })
      .update(data);
    return db("menu_categories").where({ id: categoryId }).first();
  }

  static async deleteCategory(categoryId, restaurantId) {
    return db("menu_categories").where({ id: categoryId, restaurant_id: restaurantId }).delete();
  }

  // --- Menu Items ---
  static async getMenuItems(restaurantId, categoryId = null) {
    let query = db("menu_items").where({ restaurant_id: restaurantId });
    if (categoryId) query = query.andWhere({ category_id: categoryId });
    const items = await query.orderBy("sort_order", "asc");

    const itemIds = items.map((i) => i.id);
    if (itemIds.length > 0) {
      const addonGroups = await db("item_addon_groups")
        .whereIn("menu_item_id", itemIds)
        .select("id", "menu_item_id", "name", "selection_type", "is_required");
      const groupIds = addonGroups.map((g) => g.id);

      let options = [];
      if (groupIds.length > 0) {
        options = await db("item_addon_options")
          .whereIn("addon_group_id", groupIds)
          .select("id", "addon_group_id", "name", "extra_price");
      }

      addonGroups.forEach((g) => {
        g.options = options.filter((o) => o.addon_group_id === g.id);
      });

      const relatedItems = await db("related_items")
        .whereIn("menu_item_id", itemIds)
        .select("menu_item_id", "related_item_id");

      items.forEach((item) => {
        item.addon_groups = addonGroups.filter((g) => g.menu_item_id === item.id);
        item.related_item_ids = relatedItems
          .filter((r) => r.menu_item_id === item.id)
          .map((r) => r.related_item_id);
      });
    }

    return items;
  }

  static async saveAddonGroupsAndRelatedItems(itemId, addonGroups, relatedItemIds, outerTrx = null) {
    const executeWrites = async (trx) => {
      if (addonGroups && Array.isArray(addonGroups)) {
        const existingGroups = await trx("item_addon_groups").where("menu_item_id", itemId).select("id");
        const existingGroupIds = existingGroups.map((g) => g.id);
        if (existingGroupIds.length > 0) {
          await trx("item_addon_options").whereIn("addon_group_id", existingGroupIds).delete();
          await trx("item_addon_groups").where("menu_item_id", itemId).delete();
        }

        for (const group of addonGroups) {
          if (!group.title && !group.name) continue;
          const [groupId] = await trx("item_addon_groups").insert({
            menu_item_id: itemId,
            name: group.title || group.name,
            selection_type: group.selection_type || "single",
            is_required: Boolean(group.isRequired || group.is_required),
          });

          if (group.options && Array.isArray(group.options) && group.options.length > 0) {
            const optRows = group.options
              .filter((o) => o.name)
              .map((o) => ({
                addon_group_id: groupId,
                name: o.name,
                extra_price: Number(o.price ?? o.extra_price ?? 0),
              }));
            if (optRows.length > 0) {
              await trx("item_addon_options").insert(optRows);
            }
          }
        }
      }

      if (relatedItemIds && Array.isArray(relatedItemIds)) {
        await trx("related_items").where("menu_item_id", itemId).delete();
        if (relatedItemIds.length > 0) {
          const rows = relatedItemIds.map((relId, idx) => ({
            menu_item_id: itemId,
            related_item_id: Number(relId),
            sort_order: idx,
          }));
          await trx("related_items").insert(rows);
        }
      }
    };

    if (outerTrx) {
      await executeWrites(outerTrx);
    } else {
      await db.transaction(executeWrites);
    }
  }

  static async createMenuItem(restaurantId, itemData) {
    const [id] = await db("menu_items").insert({
      restaurant_id: restaurantId,
      category_id: itemData.category_id || itemData.categoryId || null,
      name: itemData.name,
      description: itemData.description || null,
      image_url: itemData.image_url || itemData.imageUrl || null,
      base_price: itemData.base_price || itemData.price || 0,
      is_available: itemData.is_available ?? true,
      sort_order: itemData.sort_order || 0,
    });

    await this.saveAddonGroupsAndRelatedItems(id, itemData.addon_groups || itemData.addonGroups, itemData.related_item_ids || itemData.relatedItemIds);

    return db("menu_items").where({ id }).first();
  }

  static async updateMenuItem(itemId, restaurantId, updateData) {
    const existing = await db("menu_items").where({ id: itemId, restaurant_id: restaurantId }).first();
    if (!existing) {
      return null;
    }

    const payload = { ...updateData };
    const addonGroups = payload.addon_groups || payload.addonGroups;
    const relatedItemIds = payload.related_item_ids || payload.relatedItemIds;
    delete payload.addon_groups;
    delete payload.addonGroups;
    delete payload.related_item_ids;
    delete payload.relatedItemIds;
    delete payload.updated_at;

    if (Object.keys(payload).length > 0) {
      await db("menu_items").where({ id: itemId, restaurant_id: restaurantId }).update(payload);
    }

    if (addonGroups || relatedItemIds) {
      await this.saveAddonGroupsAndRelatedItems(itemId, addonGroups, relatedItemIds);
    }

    return db("menu_items").where({ id: itemId, restaurant_id: restaurantId }).first();
  }

  static async deleteMenuItem(itemId, restaurantId) {
    return db("menu_items").where({ id: itemId, restaurant_id: restaurantId }).delete();
  }

  // --- Orders ---
  static async getOrders(restaurantId, { status, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    let query = db("orders as o")
      .join("users as u", "o.user_id", "u.id")
      .leftJoin("riders as r", "o.assigned_rider_id", "r.id")
      .leftJoin("users as ru", "r.user_id", "ru.id")
      .where("o.restaurant_id", restaurantId)
      .select(
        "o.id",
        "o.status",
        "o.subtotal",
        "o.delivery_fee",
        "o.platform_fee",
        "o.discount_amount",
        "o.total",
        "o.fulfillment_type",
        "o.delivery_instructions",
        "o.placed_at",
        "o.updated_at",
        "o.assigned_rider_id",
        "o.rider_name",
        "ru.phone as rider_phone",
        "u.id as user_id",
        "u.name as user_name",
        "u.email as user_email",
        "u.phone as user_phone"
      )
      .orderBy("o.placed_at", "desc");

    if (status) {
      if (status === "preparing") {
        query = query.whereIn("o.status", ["placed", "preparing"]);
      } else {
        query = query.andWhere("o.status", status);
      }
    }

    return query.limit(limit).offset(offset);
  }

  static async updateOrderStatus(orderId, restaurantId, status) {
    await db("orders")
      .where({ id: orderId, restaurant_id: restaurantId })
      .update({
        status,
        updated_at: db.fn.now(),
      });

    return db("orders").where({ id: orderId }).first();
  }
}
