import { db } from "../database/connection.js";
import { logger } from "../utils/logger.js";

export const idempotency = () => {
  return async (req, res, next) => {
    const idempotencyKey = req.headers["idempotency-key"] || req.headers["x-idempotency-key"];
    const userId = req.user?.id;

    // Only apply if user is authenticated and header is provided
    if (!idempotencyKey || !userId) {
      return next();
    }

    try {
      // 1. Check existing record
      const existing = await db("idempotency_keys")
        .where({ user_id: userId, key: String(idempotencyKey) })
        .andWhere("expires_at", ">", db.fn.now())
        .first();

      if (existing) {
        logger.info(`⚡ Idempotent hit: Replaying cached response for key [${idempotencyKey}] on [${req.originalUrl}]`);
        res.setHeader("X-Cache-Lookup", "HIT-IDEMPOTENT");
        const body = typeof existing.response_body === "string" ? JSON.parse(existing.response_body) : existing.response_body;
        return res.status(existing.response_status).json(body);
      }

      // 2. Intercept response to store result
      const originalJson = res.json.bind(res);

      res.json = (body) => {
        // Asynchronously save without blocking response stream
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

        db("idempotency_keys")
          .insert({
            user_id: userId,
            key: String(idempotencyKey),
            endpoint: req.originalUrl,
            response_status: res.statusCode,
            response_body: JSON.stringify(body),
            expires_at: expiresAt,
          })
          .catch((err) => {
            // If duplicate key error due to race condition, ignore
            if (err.code !== "ER_DUP_ENTRY" && err.errno !== 1062) {
              logger.error("Failed to store idempotency record:", err.message);
            }
          });

        return originalJson(body);
      };

      next();
    } catch (err) {
      logger.error("Idempotency middleware error:", err.message);
      next();
    }
  };
};
