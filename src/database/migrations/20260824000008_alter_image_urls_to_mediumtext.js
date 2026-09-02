/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // Alter image URL columns to MEDIUMTEXT to safely accommodate long Cloudinary URLs and Base64 Data URIs
  await knex.schema.alterTable("menu_items", (table) => {
    table.text("image_url", "mediumtext").alter();
  });

  await knex.schema.alterTable("restaurants", (table) => {
    table.text("cover_image_url", "mediumtext").alter();
  });

  await knex.schema.alterTable("users", (table) => {
    table.text("avatar_url", "mediumtext").alter();
  });

  await knex.schema.alterTable("cuisines", (table) => {
    table.text("image_url", "mediumtext").alter();
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.alterTable("menu_items", (table) => {
    table.string("image_url", 500).alter();
  });

  await knex.schema.alterTable("restaurants", (table) => {
    table.string("cover_image_url", 500).alter();
  });

  await knex.schema.alterTable("users", (table) => {
    table.string("avatar_url", 500).alter();
  });

  await knex.schema.alterTable("cuisines", (table) => {
    table.string("image_url", 500).alter();
  });
}
