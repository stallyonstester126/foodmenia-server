import dotenv from "dotenv";
dotenv.config();

const getConnection = () => {
  const url =
    process.env.DATABASE_URL ||
    process.env.MYSQL_URL ||
    process.env.MYSQLPRIVATEURL ||
    process.env.MYSQLPUBLICURL ||
    process.env.MYSQL_PRIVATE_URL ||
    process.env.MYSQL_PUBLIC_URL;

  if (url) {
    return url;
  }

  return {
    host: process.env.DB_HOST || process.env.MYSQLHOST || process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.DB_PORT || process.env.MYSQLPORT || process.env.MYSQL_PORT) || 3306,
    user: process.env.DB_USER || process.env.MYSQLUSER || process.env.MYSQL_USER || "root",
    password: process.env.DB_PASS || process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || "",
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || "foodmenia",
    charset: "utf8mb4",
    ssl: (process.env.DB_SSL === "true" || process.env.MYSQL_SSL === "true") ? { rejectUnauthorized: false } : false,
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
