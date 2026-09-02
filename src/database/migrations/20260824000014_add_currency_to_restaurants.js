/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const hasCurrency = await knex.schema.hasColumn("restaurants", "currency");
  if (!hasCurrency) {
    await knex.schema.table("restaurants", (table) => {
      table.string("currency", 50).defaultTo("USD ($)");
    });
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const hasCurrency = await knex.schema.hasColumn("restaurants", "currency");
  if (hasCurrency) {
    await knex.schema.table("restaurants", (table) => {
      table.dropColumn("currency");
    });
  }
}
