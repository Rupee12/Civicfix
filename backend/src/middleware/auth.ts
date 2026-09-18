import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { USER_ROLES, type AuthenticatedUser, type UserRole } from "../types/auth.js";
import { ApiError } from "../utils/apiError.js";

function isAuthenticatedUser(payload: string | jwt.JwtPayload): payload is jwt.JwtPayload & AuthenticatedUser {
  return typeof payload !== "string"
    && typeof payload.userId === "string"
    && typeof payload.role === "string"
    && USER_ROLES.includes(payload.role as UserRole);
}

export const requireAuth: RequestHandler = (request, _response, next) => {
  const authorization = request.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    next(new ApiError(401, "Authentication required", "AUTHENTICATION_REQUIRED"));
    return;
  }

  try {
    const payload = jwt.verify(authorization.slice(7), env.JWT_SECRET);
    if (!isAuthenticatedUser(payload)) {
      throw new ApiError(401, "Invalid authentication token", "INVALID_TOKEN");
    }
    request.user = { userId: payload.userId, role: payload.role as UserRole };
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }
    next(new ApiError(401, "Invalid or expired authentication token", "INVALID_TOKEN"));
  }
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.user || !roles.includes(request.user.role)) {
      next(new ApiError(403, "You do not have permission to access this resource", "FORBIDDEN"));
      return;
    }
    next();
  };
}