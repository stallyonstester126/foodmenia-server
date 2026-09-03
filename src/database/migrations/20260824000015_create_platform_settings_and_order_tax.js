/**
 * Migration: Create platform_settings table and add tax columns to orders
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // 1. Create Platform Settings Table
  const hasSettingsTable = await knex.schema.hasTable("platform_settings");
  if (!hasSettingsTable) {
    await knex.schema.createTable("platform_settings", (table) => {
      table.increments("id").primary();
      table.decimal("tax_rate_percent", 5, 2).defaultTo(5.00);
      table.integer("platform_fee_cents").defaultTo(1999);
      table.integer("default_delivery_fee_cents").defaultTo(4900);
      table.boolean("is_tax_enabled").defaultTo(true);
      table.string("currency", 10).defaultTo("Rs.");
      table.integer("updated_by").unsigned().nullable().references("id").inTable("users").onDelete("SET NULL");
      table.timestamp("updated_at").defaultTo(knex.fn.now());
    });

    // Seed default configuration row
    await knex("platform_settings").insert({
      id: 1,
      tax_rate_percent: 5.00,
      platform_fee_cents: 1999,
      default_delivery_fee_cents: 4900,
      is_tax_enabled: true,
      currency: "Rs.",
    });
  }

  // 2. Add tax columns to orders table
  const hasTaxRate = await knex.schema.hasColumn("orders", "tax_rate");
  if (!hasTaxRate) {
    await knex.schema.alterTable("orders", (table) => {
      table.decimal("tax_rate", 5, 2).defaultTo(0.00);
      table.decimal("tax_amount", 10, 2).defaultTo(0.00);
    });
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const hasTaxRate = await knex.schema.hasColumn("orders", "tax_rate");
  if (hasTaxRate) {
    await knex.schema.alterTable("orders", (table) => {
      table.dropColumn("tax_amount");
      table.dropColumn("tax_rate");
    });
  }

  await knex.schema.dropTableIfExists("platform_settings");
}
