import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { UserModel, type UserDocument } from "../models/User.js";
import type { AuthenticatedUser } from "../types/auth.js";
import { ApiError } from "../utils/apiError.js";
import type { LoginInput, PasswordChangeInput, ProfileUpdateInput, RegisterInput } from "../validators/authValidators.js";
import { hashPassword, verifyPassword } from "./passwordService.js";

function toPublicUser(user: UserDocument) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, departmentId: user.departmentId, role: user.role };
}

export async function registerUser(input: RegisterInput) {
  const existingUser = await UserModel.findOne({ email: input.email }).select("_id").lean();
  if (existingUser) {
    throw new ApiError(409, "Email is already registered", "DUPLICATE_EMAIL");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await UserModel.create({ name: input.name, email: input.email, passwordHash, role: "CITIZEN" });
  return toPublicUser(user);
}

export async function loginUser(input: LoginInput) {
  const user = await UserModel.findOne({ email: input.email }).select("+passwordHash");
  if (!user || !user.isActive || !(await verifyPassword(input.password, user.passwordHash))) {
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

export async function updateProfile(userId: string, input: ProfileUpdateInput) {
  const user = await UserModel.findById(userId);
  if (!user || !user.isActive) throw new ApiError(401, "Authenticated user is no longer active", "AUTHENTICATION_REQUIRED");
  user.name = input.name;
  user.phone = input.phone || undefined;
  await user.save();
  return toPublicUser(user);
}

type PasswordChangeAccount = {
  isActive: boolean;
  passwordHash: string;
  save: () => Promise<unknown>;
};

export async function changePasswordForAccount(user: PasswordChangeAccount, input: PasswordChangeInput) {
  if (!user.isActive) throw new ApiError(401, "Authenticated user is no longer active", "AUTHENTICATION_REQUIRED");
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new ApiError(400, "Current password is incorrect", "CURRENT_PASSWORD_INVALID");
  }
  if (await verifyPassword(input.newPassword, user.passwordHash)) {
    throw new ApiError(400, "New password must be different from the current password", "PASSWORD_REUSE");
  }
  user.passwordHash = await hashPassword(input.newPassword);
  await user.save();
}

export async function changePassword(userId: string, input: PasswordChangeInput) {
  const user = await UserModel.findById(userId).select("+passwordHash");
  if (!user || !user.isActive) throw new ApiError(401, "Authenticated user is no longer active", "AUTHENTICATION_REQUIRED");
  await changePasswordForAccount(user, input);
}