import mongoose from "mongoose";
import { env } from "./env.js";

export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function connectDatabase(): Promise<boolean> {
  try {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log("MongoDB connection established");
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database connection error";
    console.error(`MongoDB connection failed: ${message}`);
    return false;
  }
}

export async function closeDatabase(): Promise<void> {
  await mongoose.connection.close();
}