import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./routes/authRoutes.js";
import { adminRouter } from "./routes/adminRoutes.js";
import { authorityRouter } from "./routes/authorityRoutes.js";
import { issueRouter } from "./routes/issueRoutes.js";
import { isDatabaseReady } from "./config/database.js";
import { notificationRouter } from "./routes/notificationRoutes.js";
import { slaRouter } from "./routes/slaRoutes.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

app.use(helmet());
const configuredOrigin = new URL(env.CORS_ORIGIN);
const allowedOrigins = new Set((env.CORS_ORIGINS ?? env.CORS_ORIGIN).split(",").map((origin) => origin.trim()).filter(Boolean));
if (configuredOrigin.hostname === "localhost") {
  configuredOrigin.hostname = "127.0.0.1";
  allowedOrigins.add(configuredOrigin.origin);
} else if (configuredOrigin.hostname === "127.0.0.1") {
  configuredOrigin.hostname = "localhost";
  allowedOrigins.add(configuredOrigin.origin);
}
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)) }));
app.use((request, response, next) => {
  const startedAt = Date.now();
  response.on("finish", () => {
    console.log(`${request.method} ${request.path} ${response.statusCode} ${Date.now() - startedAt}ms`);
  });
  next();
});
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: "draft-8", legacyHeaders: false }));
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(path.join(currentDirectory, "../uploads")));

app.get("/api/health", (_request, response) => {
  const databaseReady = isDatabaseReady();
  response.status(databaseReady ? 200 : 503).json({
    success: true,
    message: "CivicFix API is healthy",
    data: {
      service: "backend",
      environment: env.NODE_ENV,
      database: databaseReady ? "connected" : "unavailable",
    },
  });
});

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/authority", authorityRouter);
app.use("/api/issues", issueRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/sla", slaRouter);

app.use((_request, response) => {
  response.status(404).json({
    success: false,
    message: "Route not found",
    error: "NOT_FOUND",
  });
});

app.use(errorHandler);
