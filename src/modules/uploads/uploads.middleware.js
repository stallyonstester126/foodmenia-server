import multer from "multer";
import rateLimit from "express-rate-limit";
import { HTTP_STATUS } from "../../config/constants.js";
import { ApiResponse } from "../../utils/apiResponse.js";

// 1. Multer Memory Storage Configuration (No temp files on disk)
const storage = multer.memoryStorage();

// Allowed MIME types
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
]);

// 2. File Filter
const fileFilter = (req, file, cb) => {
  if (!file) {
    return cb(new Error("No file uploaded."), false);
  }

  if (ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPG, JPEG, PNG, and WEBP images are allowed."), false);
  }
};

export const uploadSingleImage = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max size limit
  },
  fileFilter,
}).single("image");

// 3. Buffer Magic Number Signature Check
export const validateImageSignature = (req, res, next) => {
  if (!req.file || !req.file.buffer) {
    return ApiResponse.error(res, "Image file buffer is missing.", HTTP_STATUS.BAD_REQUEST);
  }

  const buffer = req.file.buffer;
  if (buffer.length < 4) {
    return ApiResponse.error(res, "Invalid or corrupt image file.", HTTP_STATUS.BAD_REQUEST);
  }

  // Check magic bytes for PNG, JPEG, WEBP
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isJpg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isWebp = buffer.toString("hex", 8, 12) === "57454250"; // WEBP header magic bytes

  if (!isPng && !isJpg && !isWebp) {
    return ApiResponse.error(
      res,
      "Invalid image format signature. Only JPEG, PNG, and WEBP files are permitted.",
      HTTP_STATUS.BAD_REQUEST
    );
  }

  next();
};

// 4. Stricter Rate Limiter for Uploads
export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 uploads per 15 minutes
  message: {
    success: false,
    message: "Too many upload requests from this IP, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
