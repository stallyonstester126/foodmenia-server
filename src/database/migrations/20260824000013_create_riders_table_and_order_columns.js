/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // 1. Extend users.role enum to include 'rider' (if using enum)
  await knex.schema.alterTable("users", (table) => {
    table.string("role", 50).defaultTo("customer").alter();
  });

  // 2. Create Riders Table
  await knex.schema.createTable("riders", (table) => {
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
      .enu("account_status", ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"])
      .defaultTo("PENDING");
    table
      .enu("availability_status", ["OFFLINE", "ONLINE", "BUSY"])
      .defaultTo("OFFLINE");
    table.string("vehicle_type", 100).nullable();
    table.string("vehicle_number", 50).nullable();
    table
      .integer("current_order_id")
      .unsigned()
      .nullable();
    table.decimal("current_lat", 10, 7).nullable();
    table.decimal("current_lng", 10, 7).nullable();
    table.float("location_accuracy").nullable();
    table.float("location_heading").nullable();
    table.float("location_speed").nullable();
    table.timestamp("last_location_at").nullable();
    table.timestamps(true, true);

    table.index(["user_id"], "idx_riders_user_id");
    table.index(["account_status"], "idx_riders_account_status");
    table.index(["availability_status"], "idx_riders_availability_status");
  });

  // 3. Alter Orders Table to add assigned_rider_id FK
  await knex.schema.alterTable("orders", (table) => {
    table
      .integer("assigned_rider_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("riders")
      .onDelete("SET NULL");
    table.index(["assigned_rider_id"], "idx_orders_assigned_rider");
  });

  // Add FK constraint to current_order_id on riders table after orders table has assigned_rider_id
  await knex.schema.alterTable("riders", (table) => {
    table
      .foreign("current_order_id")
      .references("id")
      .inTable("orders")
      .onDelete("SET NULL");
    table.index(["current_order_id"], "idx_riders_current_order");
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.alterTable("riders", (table) => {
    table.dropForeign(["current_order_id"]);
  });
  await knex.schema.alterTable("orders", (table) => {
    table.dropForeign(["assigned_rider_id"]);
    table.dropColumn("assigned_rider_id");
  });
  await knex.schema.dropTableIfExists("riders");
}
