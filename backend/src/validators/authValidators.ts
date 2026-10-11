import { z } from "zod";

const email = z.string().trim().email().transform((value) => value.toLowerCase());
const password = z.string().min(8).max(128);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password,
});

export const loginSchema = z.object({ email, password });
export const profileUpdateSchema = z.object({ name: z.string().trim().min(2).max(100) });
export const passwordChangeSchema = z.object({
  currentPassword: password,
  newPassword: password,
  confirmPassword: password,
}).refine((value) => value.newPassword === value.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;