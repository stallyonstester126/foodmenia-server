export async function up(knex) {
  await knex.schema.alterTable("cart_item_addons", (table) => {
    table.index(["cart_item_id", "addon_option_id"], "idx_cia_cart_item_addon");
  });

  await knex.schema.alterTable("related_items", (table) => {
    table.index(["menu_item_id", "related_item_id"], "idx_ri_menu_related");
  });

  await knex.schema.alterTable("order_item_addons", (table) => {
    table.index(["order_item_id"], "idx_oia_order_item");
  });
}

export async function down(knex) {
  await knex.schema.alterTable("cart_item_addons", (table) => {
    table.dropIndex(["cart_item_id", "addon_option_id"], "idx_cia_cart_item_addon");
  });

  await knex.schema.alterTable("related_items", (table) => {
    table.dropIndex(["menu_item_id", "related_item_id"], "idx_ri_menu_related");
  });

  await knex.schema.alterTable("order_item_addons", (table) => {
    table.dropIndex(["order_item_id"], "idx_oia_order_item");
  });
}
