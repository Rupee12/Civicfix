import type { RequestHandler } from "express";
import type { ZodType } from "zod";

export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (request, _response, next) => {
    const parsed = schema.parse(request.query);
    Object.assign(request.query, parsed);
    next();
  };
}