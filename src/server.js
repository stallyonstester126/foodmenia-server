import http from "http";
import app from "./app.js";
import { env } from "./config/env.js";
import { testDbConnection } from "./database/connection.js";
import { initSocket } from "./sockets/orderTracking.js";
import { startOrderStatusSimulator, stopOrderStatusSimulator } from "./jobs/orderStatusSimulator.js";
import { logger } from "./utils/logger.js";

const startServer = async () => {
  try {
    // Create HTTP Server for Express & Socket.IO
    const server = http.createServer(app);

    // Initialize Socket.IO
    initSocket(server);
    logger.info("🔌 Socket.IO Server initialized for live order tracking.");

    server.listen(env.PORT, "0.0.0.0", async () => {
      logger.info(`🚀 Foodmenia Backend Server running on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`👉 API Base URL: http://localhost:${env.PORT}/api/v1`);
      logger.info(`👉 Swagger Docs: http://localhost:${env.PORT}/docs`);
      logger.info(`👉 Health Check: http://localhost:${env.PORT}/health`);
      logger.info(`👉 Live Tracking WebSocket: ws://localhost:${env.PORT}`);

      // Verify Database Connection
      await testDbConnection();
    });

    // Graceful Shutdown Handler
    const gracefulShutdown = (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      stopOrderStatusSimulator();
      server.close(() => {
        logger.info("HTTP and Socket.IO server closed.");
        process.exit(0);
      });

      // Force shutdown after 10s if connections linger
      setTimeout(() => {
        logger.error("Forcing shutdown due to timeout.");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Global Error Boundaries
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("🚨 Unhandled Promise Rejection:", reason);
    });

    process.on("uncaughtException", (error) => {
      logger.error("💥 Uncaught Exception:", error);
      gracefulShutdown("UNCAUGHT_EXCEPTION");
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
