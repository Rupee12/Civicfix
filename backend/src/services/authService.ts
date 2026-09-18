import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { UserModel, type UserDocument } from "../models/User.js";
import type { AuthenticatedUser } from "../types/auth.js";
import { ApiError } from "../utils/apiError.js";
import type { LoginInput, RegisterInput } from "../validators/authValidators.js";

const SALT_ROUNDS = 12;

function toPublicUser(user: UserDocument) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function registerUser(input: RegisterInput) {
  const existingUser = await UserModel.findOne({ email: input.email }).select("_id").lean();
  if (existingUser) {
    throw new ApiError(409, "Email is already registered", "DUPLICATE_EMAIL");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await UserModel.create({ name: input.name, email: input.email, passwordHash, role: "CITIZEN" });
  return toPublicUser(user);
}

export async function loginUser(input: LoginInput) {
  const user = await UserModel.findOne({ email: input.email }).select("+passwordHash");
  if (!user || !user.isActive || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new ApiError(401, "Invalid credentials", "INVALID_CREDENTIALS");
  }

  const payload: AuthenticatedUser = { userId: user.id, role: user.role };
  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
  return { token, user: toPublicUser(user) };
}

export async function getCurrentUser(userId: string) {
  const user = await UserModel.findById(userId);
  if (!user || !user.isActive) {
    throw new ApiError(401, "Authenticated user is no longer active", "AUTHENTICATION_REQUIRED");
  }
  return toPublicUser(user);
}