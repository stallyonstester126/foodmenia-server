/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // 1. Payment Methods Table
  await knex.schema.createTable("payment_methods", (table) => {
    table.increments("id").primary();
    table
      .integer("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.enu("type", ["card", "cod", "wallet"]).defaultTo("cod");
    table.string("provider", 50).nullable(); // e.g. Visa, Mastercard, JazzCash, EasyPaisa
    table.string("last4", 4).nullable();
    table.boolean("is_default").defaultTo(false);
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  // 2. Vouchers Table
  await knex.schema.createTable("vouchers", (table) => {
    table.increments("id").primary();
    table.string("code", 50).notNullable().unique();
    table.enu("discount_type", ["percent", "flat", "free_delivery"]).notNullable();
    table.decimal("discount_value", 10, 2).notNullable();
    table.decimal("min_order_amount", 10, 2).defaultTo(0.00);
    table.decimal("max_discount_amount", 10, 2).nullable();
    table.timestamp("valid_from").defaultTo(knex.fn.now());
    table.timestamp("valid_until").nullable();
    table.integer("usage_limit").defaultTo(1000);
    table.integer("per_user_limit").defaultTo(1);
    table.boolean("is_active").defaultTo(true);
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  // 3. Orders Table
  await knex.schema.createTable("orders", (table) => {
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
      .notNullable()
      .references("id")
      .inTable("restaurants")
      .onDelete("CASCADE");
    table
      .integer("address_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("addresses")
      .onDelete("SET NULL");
    table.enu("fulfillment_type", ["delivery", "pickup"]).defaultTo("delivery");
    table
      .enu("status", ["placed", "preparing", "ready", "delivering", "delivered", "cancelled"])
      .defaultTo("placed");
    table.decimal("subtotal", 10, 2).notNullable();
    table.decimal("delivery_fee", 10, 2).notNullable();
    table.decimal("platform_fee", 10, 2).notNullable();
    table.decimal("discount_amount", 10, 2).defaultTo(0.00);
    table.decimal("total", 10, 2).notNullable();
    table
      .integer("payment_method_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("payment_methods")
      .onDelete("SET NULL");
    table
      .integer("voucher_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("vouchers")
      .onDelete("SET NULL");
    table.text("delivery_instructions").nullable();
    table.integer("estimated_delivery_min").defaultTo(20);
    table.integer("estimated_delivery_max").defaultTo(35);
    table.string("rider_name", 100).nullable();
    table.timestamp("placed_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  // 4. Voucher Redemptions Table
  await knex.schema.createTable("voucher_redemptions", (table) => {
    table.increments("id").primary();
    table
      .integer("voucher_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("vouchers")
      .onDelete("CASCADE");
    table
      .integer("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .integer("order_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("orders")
      .onDelete("SET NULL");
    table.timestamp("redeemed_at").defaultTo(knex.fn.now());
  });

  // 5. Order Items Table
  await knex.schema.createTable("order_items", (table) => {
    table.increments("id").primary();
    table
      .integer("order_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("orders")
      .onDelete("CASCADE");
    table
      .integer("menu_item_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("menu_items")
      .onDelete("CASCADE");
    table.string("name_snapshot", 255).notNullable();
    table.integer("quantity").notNullable().defaultTo(1);
    table.decimal("unit_price_snapshot", 10, 2).notNullable();
    table.text("special_instructions").nullable();
  });

  // 6. Order Item Addons Table
  await knex.schema.createTable("order_item_addons", (table) => {
    table.increments("id").primary();
    table
      .integer("order_item_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("order_items")
      .onDelete("CASCADE");
    table.string("name_snapshot", 255).notNullable();
    table.decimal("price_snapshot", 10, 2).notNullable();
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("order_item_addons");
  await knex.schema.dropTableIfExists("order_items");
  await knex.schema.dropTableIfExists("voucher_redemptions");
  await knex.schema.dropTableIfExists("orders");
  await knex.schema.dropTableIfExists("vouchers");
  await knex.schema.dropTableIfExists("payment_methods");
}
