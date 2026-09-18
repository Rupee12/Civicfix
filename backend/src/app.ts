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

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: "draft-8", legacyHeaders: false }));
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(path.join(currentDirectory, "../uploads")));

app.get("/api/health", (_request, response) => {
  response.json({
    success: true,
    message: "CivicFix API is healthy",
    data: {
      service: "backend",
      environment: env.NODE_ENV,
    },
  });
});

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/authority", authorityRouter);
app.use("/api/issues", issueRouter);

app.use((_request, response) => {
  response.status(404).json({
    success: false,
    message: "Route not found",
    error: "NOT_FOUND",
  });
});

app.use(errorHandler);
