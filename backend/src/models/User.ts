import { Schema, Types, model, type HydratedDocument, type Model } from "mongoose";
import { USER_ROLES, type UserRole } from "../types/auth.js";

export interface User {
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  role: UserRole;
  departmentId?: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;

const userSchema = new Schema<User>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, trim: true, maxlength: 30 },
    role: { type: String, enum: USER_ROLES, default: "CITIZEN", index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const UserModel: Model<User> = model<User>("User", userSchema);