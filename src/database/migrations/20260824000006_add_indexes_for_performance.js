/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // 1. Orders Indexes
  await knex.schema.alterTable("orders", (table) => {
    table.index(["user_id"], "idx_orders_user_id");
    table.index(["restaurant_id"], "idx_orders_restaurant_id");
    table.index(["status"], "idx_orders_status");
    table.index(["placed_at"], "idx_orders_placed_at");
  });

  // 2. Menu Items Indexes
  await knex.schema.alterTable("menu_items", (table) => {
    table.index(["restaurant_id"], "idx_menu_items_restaurant_id");
    table.index(["category_id"], "idx_menu_items_category_id");
    table.index(["is_available"], "idx_menu_items_is_available");
  });

  // 3. Vouchers Indexes
  await knex.schema.alterTable("vouchers", (table) => {
    table.index(["is_active"], "idx_vouchers_is_active");
  });

  // 4. Cart Items Indexes
  await knex.schema.alterTable("cart_items", (table) => {
    table.index(["cart_id"], "idx_cart_items_cart_id");
  });

  // 5. Order Items Indexes
  await knex.schema.alterTable("order_items", (table) => {
    table.index(["order_id"], "idx_order_items_order_id");
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.alterTable("order_items", (table) => {
    table.dropIndex([], "idx_order_items_order_id");
  });
  await knex.schema.alterTable("cart_items", (table) => {
    table.dropIndex([], "idx_cart_items_cart_id");
  });
  await knex.schema.alterTable("vouchers", (table) => {
    table.dropIndex([], "idx_vouchers_is_active");
  });
  await knex.schema.alterTable("menu_items", (table) => {
    table.dropIndex([], "idx_menu_items_is_available");
    table.dropIndex([], "idx_menu_items_category_id");
    table.dropIndex([], "idx_menu_items_restaurant_id");
  });
  await knex.schema.alterTable("orders", (table) => {
    table.dropIndex([], "idx_orders_placed_at");
    table.dropIndex([], "idx_orders_status");
    table.dropIndex([], "idx_orders_restaurant_id");
    table.dropIndex([], "idx_orders_user_id");
  });
}
