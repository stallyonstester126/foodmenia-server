import dotenv from "dotenv";
dotenv.config();

const getConnection = () => {
  if (process.env.MYSQL_URL || process.env.DATABASE_URL) {
    return process.env.MYSQL_URL || process.env.DATABASE_URL;
  }

  return {
    host: process.env.DB_HOST || process.env.MYSQLHOST || "localhost",
    port: Number(process.env.DB_PORT || process.env.MYSQLPORT) || 3306,
    user: process.env.DB_USER || process.env.MYSQLUSER || "root",
    password: process.env.DB_PASS || process.env.MYSQLPASSWORD || "",
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || "foodmenia",
    charset: "utf8mb4",
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  };
};

const config = {
  development: {
    client: "mysql2",
    connection: getConnection(),
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: "./src/database/migrations",
      tableName: "knex_migrations",
    },
    seeds: {
      directory: "./src/database/seeds",
    },
  },
  production: {
    client: "mysql2",
    connection: getConnection(),
    pool: {
      min: 2,
      max: 20,
    },
    migrations: {
      directory: "./src/database/migrations",
      tableName: "knex_migrations",
    },
    seeds: {
      directory: "./src/database/seeds",
    },
  },
};

export default config;
