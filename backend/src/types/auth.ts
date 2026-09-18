export const USER_ROLES = ["CITIZEN", "AUTHORITY", "ADMIN"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
}