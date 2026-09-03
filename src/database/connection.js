import knex from "knex";
import knexConfig from "../../knexfile.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const environment = env.NODE_ENV || "development";
const config = knexConfig[environment] || knexConfig.development;

export const db = knex(config);

// Test database connection
export const testDbConnection = async () => {
  try {
    await db.raw("SELECT 1+1 AS result");
    const target =
      typeof config.connection === "string"
        ? "MySQL URL"
        : `${config.connection?.database || "foodmenia"} on host [${config.connection?.host || "db"}]`;
    logger.info(`✅ Connected to MySQL database [${target}]`);
    return true;
  } catch (error) {
    logger.error("❌ MySQL Database connection failed:", error.message);
    return false;
  }
};
