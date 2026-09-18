import type { ErrorRequestHandler } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { ApiError } from "../utils/apiError.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    response.status(400).json({ success: false, message: "Invalid media upload", error: "INVALID_MEDIA_UPLOAD" });
    return;
  }

  if (error?.type === "entity.parse.failed" || error?.statusCode === 400) {
    response.status(400).json({ success: false, message: "Invalid request data", error: "VALIDATION_ERROR" });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({ success: false, message: "Invalid request data", error: "VALIDATION_ERROR" });
    return;
  }

  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ success: false, message: error.message, error: error.code });
    return;
  }

  if (error?.code === 11000) {
    response.status(409).json({ success: false, message: "Email is already registered", error: "DUPLICATE_EMAIL" });
    return;
  }

  console.error(error);
  response.status(500).json({ success: false, message: "Internal server error", error: "INTERNAL_SERVER_ERROR" });
};