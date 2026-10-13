import type { RequestHandler } from "express";
import { timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { requireAuth, requireRole } from "./auth.js";
import { ApiError } from "../utils/apiError.js";

export const requireSlaProcessorAuth: RequestHandler = (request, response, next) => {
  const provided = request.header("x-sla-cron-secret");
  if (provided && env.SLA_CRON_SECRET) {
    const expected = Buffer.from(env.SLA_CRON_SECRET);
    const actual = Buffer.from(provided);
    if (actual.length === expected.length && timingSafeEqual(actual, expected)) {
      next();
      return;
    }
    next(new ApiError(403, "Invalid SLA scheduler credential", "FORBIDDEN"));
    return;
  }
  requireAuth(request, response, (error) => {
    if (error) { next(error); return; }
    requireRole("ADMIN")(request, response, next);
  });
};
