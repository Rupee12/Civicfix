import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/civicfix"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
  JWT_EXPIRES_IN: z.string().min(1).default("7d"),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  CORS_ORIGINS: z.string().optional(),
  MEDIA_STORAGE: z.enum(["local", "cloudinary"]).default("local"),
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  const details = parsedEnvironment.error.issues
    .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment configuration: ${details}`);
}

if (parsedEnvironment.data.NODE_ENV === "production" && parsedEnvironment.data.MEDIA_STORAGE !== "cloudinary") {
  throw new Error("Production requires MEDIA_STORAGE=cloudinary; local media storage is not durable.");
}

if (parsedEnvironment.data.MEDIA_STORAGE === "cloudinary" && (!parsedEnvironment.data.CLOUDINARY_CLOUD_NAME || !parsedEnvironment.data.CLOUDINARY_API_KEY || !parsedEnvironment.data.CLOUDINARY_API_SECRET)) {
  throw new Error("Cloudinary media storage requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET");
}

export const env = parsedEnvironment.data;
