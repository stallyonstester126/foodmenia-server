/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // 1. Users Table Additions (stripe_customer_id, role)
  await knex.schema.alterTable("users", (table) => {
    table.string("stripe_customer_id", 255).nullable();
    table.enu("role", ["customer", "admin", "restaurant_owner"]).defaultTo("customer");
    table.index(["role"], "idx_users_role");
  });

  // 2. Payment Methods Table Additions (provider_payment_method_id, brand)
  await knex.schema.alterTable("payment_methods", (table) => {
    table.string("provider_payment_method_id", 255).nullable();
    table.string("brand", 50).nullable();
  });

  // 3. Restaurants Table Additions (owner_id FK)
  await knex.schema.alterTable("restaurants", (table) => {
    table
      .integer("owner_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
  });

  // 4. Orders Table Additions (stripe_payment_intent_id, refund fields)
  await knex.schema.alterTable("orders", (table) => {
    table.string("stripe_payment_intent_id", 255).nullable();
    table.decimal("refund_amount", 10, 2).defaultTo(0.00);
    table.string("refund_reason", 255).nullable();
  });

  // 5. Idempotency Keys Table
  await knex.schema.createTable("idempotency_keys", (table) => {
    table.increments("id").primary();
    table
      .integer("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.string("key", 255).notNullable().unique();
    table.string("endpoint", 255).notNullable();
    table.integer("response_status").notNullable();
    table.json("response_body").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("expires_at").notNullable();
    table.index(["user_id", "key"], "idx_idempotency_user_key");
  });

  // 6. Refresh Tokens Table (SHA-256 Hashed Tokens & Revocation)
  await knex.schema.createTable("refresh_tokens", (table) => {
    table.increments("id").primary();
    table
      .integer("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.string("token_hash", 255).notNullable().unique();
    table.string("device_info", 255).nullable();
    table.timestamp("expires_at").notNullable();
    table.timestamp("revoked_at").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.index(["token_hash"], "idx_refresh_tokens_hash");
    table.index(["user_id"], "idx_refresh_tokens_user_id");
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("refresh_tokens");
  await knex.schema.dropTableIfExists("idempotency_keys");
  await knex.schema.alterTable("orders", (table) => {
    table.dropColumn("refund_reason");
    table.dropColumn("refund_amount");
    table.dropColumn("stripe_payment_intent_id");
  });
  await knex.schema.alterTable("restaurants", (table) => {
    table.dropForeign(["owner_id"]);
    table.dropColumn("owner_id");
  });
  await knex.schema.alterTable("payment_methods", (table) => {
    table.dropColumn("brand");
    table.dropColumn("provider_payment_method_id");
  });
  await knex.schema.alterTable("users", (table) => {
    table.dropIndex([], "idx_users_role");
    table.dropColumn("role");
    table.dropColumn("stripe_customer_id");
  });
}
