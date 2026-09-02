/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const hasColumn = await knex.schema.hasColumn("restaurants", "type");
  if (!hasColumn) {
    await knex.schema.alterTable("restaurants", (table) => {
      table.enu("type", ["restaurant", "shop"]).defaultTo("restaurant");
    });
  }

  // Ensure shop categories exist in cuisines table
  const shopCategories = [
    "Grocery",
    "Bakery",
    "Convenience",
    "Supermarket",
    "Snacks & Drinks",
    "Fresh Produce",
  ];

  for (const name of shopCategories) {
    const existing = await knex("cuisines").where({ name }).first();
    if (!existing) {
      await knex("cuisines").insert({ name, image_url: "/shophero.png" });
    }
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const hasColumn = await knex.schema.hasColumn("restaurants", "type");
  if (hasColumn) {
    await knex.schema.alterTable("restaurants", (table) => {
      table.dropColumn("type");
    });
  }
}
