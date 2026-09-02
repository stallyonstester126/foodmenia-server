import dotenv from "dotenv";

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 5000,
  CLIENT_URL: process.env.CLIENT_URL || "https://foodmenia-client-xkie-pi.vercel.app",
  ADMIN_URL: process.env.ADMIN_URL || "http://localhost:3001",
  ALLOWED_ORIGINS: (
    process.env.ALLOWED_ORIGINS ||
    "http://localhost:3000,http://localhost:3001,http://localhost:3002,https://foodmenia-client-xkie-pi.vercel.app,https://foodmenia-rider.vercel.app,https://foodmenia-admin.vercel.app"
  )
    .split(",")
    .map((o) => o.trim()),
  DB: {
    HOST: process.env.DB_HOST || "localhost",
    PORT: Number(process.env.DB_PORT) || 3306,
    USER: process.env.DB_USER || "root",
    PASS: process.env.DB_PASS || "",
    NAME: process.env.DB_NAME || "foodmenia",
  },
  JWT: {
    SECRET: process.env.JWT_SECRET || "default_super_secret_jwt_key_foodmenia_2026",
    EXPIRY: process.env.JWT_EXPIRY || "7d",
    REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "default_refresh_secret_jwt_key_foodmenia_2026",
    REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || "30d",
  },
  STRIPE: {
    SECRET_KEY: process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_foodmenia_2026",
    PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder_foodmenia_2026",
    WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "whsec_placeholder_foodmenia_2026",
  },
  FEES: {
    PLATFORM_FEE_CENTS: Number(process.env.PLATFORM_FEE_CENTS) || 1999,
    DEFAULT_DELIVERY_FEE_CENTS: Number(process.env.DEFAULT_DELIVERY_FEE_CENTS) || 4900,
  },
  BREVO: {
    API_KEY: process.env.BREVO_API_KEY || process.env.EMAIL_SERVICE_API_KEY || "",
    SENDER_NAME: process.env.EMAIL_SENDER_NAME || process.env.BREVO_SENDER_NAME || "FoodMenia",
    SENDER_EMAIL: process.env.EMAIL_SENDER_ADDRESS || process.env.BREVO_SENDER_EMAIL || "stallyons.tester125@gmail.com",
  },
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
    API_KEY: process.env.CLOUDINARY_API_KEY || "",
    API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
  },
};
