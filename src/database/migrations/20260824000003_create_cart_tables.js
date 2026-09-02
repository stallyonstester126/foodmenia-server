/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // 1. Carts Table
  await knex.schema.createTable("carts", (table) => {
    table.increments("id").primary();
    table
      .integer("user_id")
      .unsigned()
      .notNullable()
      .unique()
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
    table.enu("fulfillment_type", ["delivery", "pickup"]).defaultTo("delivery");
    table.timestamps(true, true);
  });

  // 2. Cart Items Table
  await knex.schema.createTable("cart_items", (table) => {
    table.increments("id").primary();
    table
      .integer("cart_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("carts")
      .onDelete("CASCADE");
    table
      .integer("menu_item_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("menu_items")
      .onDelete("CASCADE");
    table.integer("quantity").notNullable().defaultTo(1);
    table.text("special_instructions").nullable();
    table.enu("unavailable_action", ["remove", "substitute"]).defaultTo("remove");
    table.decimal("unit_price_snapshot", 10, 2).notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  // 3. Cart Item Addons Table
  await knex.schema.createTable("cart_item_addons", (table) => {
    table.increments("id").primary();
    table
      .integer("cart_item_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("cart_items")
      .onDelete("CASCADE");
    table
      .integer("addon_option_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("item_addon_options")
      .onDelete("CASCADE");
    table.decimal("price_snapshot", 10, 2).notNullable();
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("cart_item_addons");
  await knex.schema.dropTableIfExists("cart_items");
  await knex.schema.dropTableIfExists("carts");
}
