/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const hasVerificationOtp = await knex.schema.hasColumn("users", "verification_otp");
  if (!hasVerificationOtp) {
    await knex.schema.alterTable("users", (table) => {
      table.string("verification_otp", 20).nullable();
      table.timestamp("verification_otp_expires_at").nullable();
    });
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  const hasVerificationOtp = await knex.schema.hasColumn("users", "verification_otp");
  if (hasVerificationOtp) {
    await knex.schema.alterTable("users", (table) => {
      table.dropColumn("verification_otp");
      table.dropColumn("verification_otp_expires_at");
    });
  }
}
