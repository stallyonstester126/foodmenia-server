import { ApiResponse } from "../utils/apiResponse.js";
import { HTTP_STATUS } from "../config/constants.js";

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, "Authentication required.", HTTP_STATUS.UNAUTHORIZED);
    }

    const userRole = req.user.role || "customer";

    if (!allowedRoles.includes(userRole)) {
      return ApiResponse.error(
        res,
        `Access denied. Requires one of the following roles: [${allowedRoles.join(", ")}]. Current role: '${userRole}'`,
        HTTP_STATUS.FORBIDDEN
      );
    }

    next();
  };
};
