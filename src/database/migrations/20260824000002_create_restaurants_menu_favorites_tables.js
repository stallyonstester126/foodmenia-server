/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // 1. Cuisines Table
  await knex.schema.createTable("cuisines", (table) => {
    table.increments("id").primary();
    table.string("name", 100).notNullable().unique();
    table.string("image_url", 500).nullable();
  });

  // 2. Restaurants Table
  await knex.schema.createTable("restaurants", (table) => {
    table.increments("id").primary();
    table.string("name", 255).notNullable();
    table.string("cover_image_url", 500).nullable();
    table.text("description").nullable();
    table.string("address", 500).nullable();
    table.decimal("lat", 10, 7).nullable();
    table.decimal("lng", 10, 7).nullable();
    table.decimal("rating", 3, 2).defaultTo(0.00);
    table.integer("rating_count").defaultTo(0);
    table.enu("price_tier", ["$", "$$", "$$$"]).defaultTo("$$");
    table.integer("delivery_time_min").defaultTo(20);
    table.integer("delivery_time_max").defaultTo(35);
    table.boolean("is_active").defaultTo(true);
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  // 3. Restaurant Cuisines (Many-to-Many)
  await knex.schema.createTable("restaurant_cuisines", (table) => {
    table
      .integer("restaurant_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("restaurants")
      .onDelete("CASCADE");
    table
      .integer("cuisine_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("cuisines")
      .onDelete("CASCADE");
    table.primary(["restaurant_id", "cuisine_id"]);
  });

  // 4. Menu Categories Table (e.g. Popular, Starters, BBQ, Rolls, Bread)
  await knex.schema.createTable("menu_categories", (table) => {
    table.increments("id").primary();
    table
      .integer("restaurant_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("restaurants")
      .onDelete("CASCADE");
    table.string("name", 100).notNullable();
    table.integer("sort_order").defaultTo(0);
  });

  // 5. Menu Items Table
  await knex.schema.createTable("menu_items", (table) => {
    table.increments("id").primary();
    table
      .integer("restaurant_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("restaurants")
      .onDelete("CASCADE");
    table
      .integer("category_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("menu_categories")
      .onDelete("CASCADE");
    table.string("name", 255).notNullable();
    table.text("description").nullable();
    table.string("image_url", 500).nullable();
    table.decimal("base_price", 10, 2).notNullable();
    table.boolean("is_available").defaultTo(true);
    table.integer("sort_order").defaultTo(0);
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  // 6. Item Addon Groups Table (e.g. "Choose Extra Cheese Slice")
  await knex.schema.createTable("item_addon_groups", (table) => {
    table.increments("id").primary();
    table
      .integer("menu_item_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("menu_items")
      .onDelete("CASCADE");
    table.string("name", 150).notNullable();
    table.enu("selection_type", ["single", "multiple"]).defaultTo("single");
    table.boolean("is_required").defaultTo(false);
  });

  // 7. Item Addon Options Table
  await knex.schema.createTable("item_addon_options", (table) => {
    table.increments("id").primary();
    table
      .integer("addon_group_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("item_addon_groups")
      .onDelete("CASCADE");
    table.string("name", 150).notNullable();
    table.decimal("extra_price", 10, 2).defaultTo(0.00);
  });

  // 8. Related Items Table ("Frequently Bought Together")
  await knex.schema.createTable("related_items", (table) => {
    table
      .integer("menu_item_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("menu_items")
      .onDelete("CASCADE");
    table
      .integer("related_item_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("menu_items")
      .onDelete("CASCADE");
    table.integer("sort_order").defaultTo(0);
    table.primary(["menu_item_id", "related_item_id"]);
  });

  // 9. Favorites Table
  await knex.schema.createTable("favorites", (table) => {
    table.increments("id").primary();
    table
      .integer("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .integer("restaurant_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("restaurants")
      .onDelete("CASCADE");
    table
      .integer("menu_item_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("menu_items")
      .onDelete("CASCADE");
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("favorites");
  await knex.schema.dropTableIfExists("related_items");
  await knex.schema.dropTableIfExists("item_addon_options");
  await knex.schema.dropTableIfExists("item_addon_groups");
  await knex.schema.dropTableIfExists("menu_items");
  await knex.schema.dropTableIfExists("menu_categories");
  await knex.schema.dropTableIfExists("restaurant_cuisines");
  await knex.schema.dropTableIfExists("restaurants");
  await knex.schema.dropTableIfExists("cuisines");
}
