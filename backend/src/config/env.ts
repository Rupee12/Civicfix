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
  MEDIA_STORAGE: z.enum(["local", "s3"]).default("local"),
  S3_BUCKET: z.string().min(1).optional(),
  S3_REGION: z.string().min(1).default("auto"),
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  MEDIA_PUBLIC_BASE_URL: z.string().url().optional(),
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  const details = parsedEnvironment.error.issues
    .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment configuration: ${details}`);
}

if (parsedEnvironment.data.MEDIA_STORAGE === "s3" && (!parsedEnvironment.data.S3_BUCKET || !parsedEnvironment.data.S3_ACCESS_KEY_ID || !parsedEnvironment.data.S3_SECRET_ACCESS_KEY || !parsedEnvironment.data.MEDIA_PUBLIC_BASE_URL)) {
  throw new Error("S3 media storage requires S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and MEDIA_PUBLIC_BASE_URL");
}

export const env = parsedEnvironment.data;
