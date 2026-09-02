import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import hpp from "hpp";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import { fileURLToPath } from "url";

import { env } from "./config/env.js";
import { globalRateLimiter } from "./middlewares/rateLimiter.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { ApiResponse } from "./utils/apiResponse.js";
import { HTTP_STATUS } from "./config/constants.js";
import { db } from "./database/connection.js";

// Routes
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import settingsRoutes from "./modules/settings/settings.routes.js";
import restaurantsRoutes from "./modules/restaurants/restaurants.routes.js";
import menuRoutes from "./modules/menu/menu.routes.js";
import favoritesRoutes from "./modules/favorites/favorites.routes.js";
import cartRoutes from "./modules/cart/cart.routes.js";
import checkoutRoutes from "./modules/checkout/checkout.routes.js";
import ordersRoutes from "./modules/orders/orders.routes.js";
import paymentsRoutes from "./modules/payments/payments.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import vouchersRoutes from "./modules/vouchers/vouchers.routes.js";
import restaurantOwnerRoutes from "./modules/restaurant-owner/restaurantOwner.routes.js";
import uploadsRoutes from "./modules/uploads/uploads.routes.js";
import riderRoutes from "./modules/rider/rider.routes.js";
import { RestaurantsController } from "./modules/restaurants/restaurants.controller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. Security Middlewares
app.use(helmet());
app.use(hpp());
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        env.ALLOWED_ORIGINS.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        env.NODE_ENV === "development"
      ) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin ${origin}`));
      }
    },
    credentials: true,
  })
);

// 2. Body Parsers (with raw body buffer preserved for Stripe webhook signatures)
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 3. Request Logging
if (env.NODE_ENV !== "test") {
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
}

// 4. Global Rate Limiter
app.use("/api", globalRateLimiter);

// 5. Swagger API Documentation (/docs & /api-docs)
try {
  const swaggerDocument = YAML.load(path.join(__dirname, "docs", "openapi.yaml"));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (err) {
  console.warn("Swagger document failed to load:", err.message);
}

// Root Endpoint
app.get("/", (req, res) => {
  return ApiResponse.success(
    res,
    {
      name: "FoodMenia Backend API",
      version: "1.0.0",
      status: "operational",
      endpoints: {
        health: "/health",
        docs: "/docs",
        api: "/api/v1",
      },
    },
    "Welcome to FoodMenia Production API"
  );
});

// 6. Production Health Check Endpoint (DB Ping included)
app.get("/health", async (req, res) => {
  let dbStatus = "connected";
  let latencyMs = 0;
  const start = Date.now();

  try {
    await db.raw("SELECT 1+1 AS result");
    latencyMs = Date.now() - start;
  } catch (err) {
    dbStatus = "disconnected";
  }

  const isHealthy = dbStatus === "connected";

  return res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    message: isHealthy ? "Foodmenia API is operational." : "Database connection degraded.",
    data: {
      status: isHealthy ? "healthy" : "unhealthy",
      database: {
        status: dbStatus,
        latency_ms: latencyMs,
      },
      uptime_seconds: Math.floor(process.uptime()),
      memory_usage: process.memoryUsage(),
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  });
});

// 7. Mount API Modules
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/restaurants", restaurantsRoutes);
app.use("/api/v1/menu-items", menuRoutes);
app.use("/api/v1/favorites", favoritesRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/checkout", checkoutRoutes);
app.use("/api/v1/orders", ordersRoutes);
app.use("/api/v1/payments", paymentsRoutes);
app.use("/api/v1/vouchers", vouchersRoutes);
app.use("/api/v1/restaurant-owner", restaurantOwnerRoutes);
app.use("/api/v1/uploads", uploadsRoutes);
app.use("/api/v1/rider", riderRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/cuisines", RestaurantsController.getCuisines);

// 8. 404 Handler
app.use("*", (req, res) => {
  return ApiResponse.error(
    res,
    `Route ${req.method} ${req.originalUrl} not found`,
    HTTP_STATUS.NOT_FOUND
  );
});

// 9. Centralized Error Handler
app.use(errorHandler);

export default app;
