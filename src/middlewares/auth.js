import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { db } from "../database/connection.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { HTTP_STATUS } from "../config/constants.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return ApiResponse.error(
        res,
        "Authentication required. No token provided.",
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.JWT.SECRET);

    // Fetch user from DB
    const user = await db("users")
      .where({ id: decoded.id })
      .select("id", "name", "email", "phone", "avatar_url", "email_verified", "role", "created_at")
      .first();

    if (!user) {
      return ApiResponse.error(
        res,
        "User associated with this token no longer exists.",
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return ApiResponse.error(res, "Token has expired. Please login again.", HTTP_STATUS.UNAUTHORIZED);
    }
    return ApiResponse.error(res, "Invalid token. Authentication failed.", HTTP_STATUS.UNAUTHORIZED);
  }
};
