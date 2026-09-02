/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // 1. Users Table
  await knex.schema.createTable("users", (table) => {
    table.increments("id").primary();
    table.string("name", 255).notNullable();
    table.string("email", 255).notNullable().unique();
    table.string("phone", 50).nullable();
    table.string("password_hash", 255).notNullable();
    table.string("avatar_url", 500).nullable();
    table.boolean("email_verified").defaultTo(false);
    table.string("reset_password_token", 255).nullable();
    table.timestamp("reset_password_expires_at").nullable();
    table.timestamps(true, true); // created_at, updated_at
  });

  // 2. Addresses Table
  await knex.schema.createTable("addresses", (table) => {
    table.increments("id").primary();
    table
      .integer("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.string("label", 50).defaultTo("Home"); // Home, Work, Other
    table.string("full_address", 500).notNullable();
    table.decimal("lat", 10, 7).nullable();
    table.decimal("lng", 10, 7).nullable();
    table.string("city", 100).nullable();
    table.string("country", 100).nullable();
    table.boolean("is_default").defaultTo(false);
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  // 3. User Settings Table
  await knex.schema.createTable("user_settings", (table) => {
    table.increments("id").primary();
    table
      .integer("user_id")
      .unsigned()
      .notNullable()
      .unique()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.string("language", 50).defaultTo("English");
    table.boolean("push_notifications").defaultTo(true);
    table.boolean("email_offers").defaultTo(true);
    table.boolean("show_tracking_cost").defaultTo(true);
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("user_settings");
  await knex.schema.dropTableIfExists("addresses");
  await knex.schema.dropTableIfExists("users");
}
