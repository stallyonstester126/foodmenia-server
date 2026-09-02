import { ApiResponse } from "../utils/apiResponse.js";
import { HTTP_STATUS } from "../config/constants.js";

export const validate = (schema) => {
  return (req, res, next) => {
    if (!schema) return next();

    const validationTargets = ["body", "query", "params"];
    for (const target of validationTargets) {
      if (schema[target]) {
        const { error, value } = schema[target].validate(req[target], {
          abortEarly: false,
          stripUnknown: true,
        });

        if (error) {
          const errorMessage = error.details.map((detail) => detail.message).join(", ");
          return ApiResponse.error(res, errorMessage, HTTP_STATUS.BAD_REQUEST, error.details);
        }

        // Replace with sanitized/validated values
        req[target] = value;
      }
    }

    next();
  };
};
