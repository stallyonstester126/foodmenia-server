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
    logger.info(`✅ Connected to MySQL database [${config.connection.database}] on host [${config.connection.host}]`);
    return true;
  } catch (error) {
    logger.error("❌ MySQL Database connection failed:", error.message);
    return false;
  }
};
