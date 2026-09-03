import knex from "knex";
import knexConfig from "../../knexfile.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const environment = env.NODE_ENV || "development";
const config = knexConfig[environment] || knexConfig.development;

export const db = knex(config);

// Test database connection with retry resilience for cloud deployments
export const testDbConnection = async (retries = 5, delayMs = 2000) => {
  for (let i = 1; i <= retries; i++) {
    try {
      await db.raw("SELECT 1+1 AS result");
      const target =
        typeof config.connection === "string"
          ? "MySQL URL"
          : `${config.connection?.database || "foodmenia"} on host [${config.connection?.host || "db"}]`;
      logger.info(`✅ Connected to MySQL database [${target}]`);
      return true;
    } catch (error) {
      logger.warn(`⚠️ MySQL Database connection attempt ${i}/${retries} failed: ${error.message}`);
      if (i < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  logger.error("❌ MySQL Database connection failed after maximum retries.");
  return false;
};
