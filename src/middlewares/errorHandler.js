import { logger } from "../utils/logger.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { HTTP_STATUS } from "../config/constants.js";

export const errorHandler = (err, req, res, next) => {
  // Always log full stack trace and internal error details to server logger only
  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, {
    stack: err.stack,
    sqlMessage: err.sqlMessage,
    code: err.code,
  });

  // MySQL Duplicate Entry Error (Code 1062 / ER_DUP_ENTRY)
  if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) {
    return ApiResponse.error(
      res,
      "Duplicate resource detected. A record with this information already exists.",
      HTTP_STATUS.CONFLICT,
      null
    );
  }

  // JWT Authentication Errors
  if (err.name === "JsonWebTokenError") {
    return ApiResponse.error(res, "Invalid authentication token", HTTP_STATUS.UNAUTHORIZED, null);
  }

  if (err.name === "TokenExpiredError") {
    return ApiResponse.error(res, "Authentication token has expired", HTTP_STATUS.UNAUTHORIZED, null);
  }

  // Joi Validation Error
  if (err.isJoi) {
    const safeValidationMsg = err.details ? err.details[0].message : err.message;
    return ApiResponse.error(res, safeValidationMsg, HTTP_STATUS.BAD_REQUEST, null);
  }

  // Operational vs 500 Internal Server Error
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const isOperational = statusCode < 500;
  const clientMessage = isOperational
    ? err.message
    : "An unexpected internal server error occurred. Please try again later.";

  return ApiResponse.error(
    res,
    clientMessage,
    statusCode,
    null
  );
};
