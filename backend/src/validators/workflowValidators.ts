import { z } from "zod";
import { ISSUE_STATUSES, PRIORITY_LEVELS } from "../types/issue.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");

export const departmentCreateSchema = z.object({ name: z.string().trim().min(2).max(100), code: z.string().trim().min(2).max(30).regex(/^[A-Za-z0-9_-]+$/), description: z.string().trim().max(500).optional() });
export const departmentUpdateSchema = departmentCreateSchema.partial().extend({ isActive: z.boolean().optional() });
export const authorityCreateSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email(), password: z.string().min(8).max(128), departmentId: objectId.optional() });
export const authorityUpdateSchema = z.object({ name: z.string().trim().min(2).max(100).optional(), departmentId: objectId.nullable().optional(), isActive: z.boolean().optional() });
export const assignmentSchema = z.object({ departmentId: objectId, assignedTo: objectId, reason: z.string().trim().max(500).optional() });
export const statusUpdateSchema = z.object({ status: z.enum(ISSUE_STATUSES), reason: z.string().trim().max(500).optional() });
export const authorityQueueSchema = z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().positive().max(50).default(20), status: z.enum(ISSUE_STATUSES).optional(), priorityLevel: z.enum(PRIORITY_LEVELS).optional(), sort: z.enum(["priority", "newest", "oldest"]).default("priority") });
export const resolutionSchema = z.object({ description: z.string().trim().min(10).max(2000) });
export const verificationSchema = z.object({
  vote: z.enum(["RESOLVED", "NOT_RESOLVED"]),
  comment: z.string().trim().max(1000).optional(),
});

export type DepartmentCreateInput = z.infer<typeof departmentCreateSchema>;
export type DepartmentUpdateInput = z.infer<typeof departmentUpdateSchema>;
export type AuthorityCreateInput = z.infer<typeof authorityCreateSchema>;
export type AuthorityUpdateInput = z.infer<typeof authorityUpdateSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type StatusUpdateInput = z.infer<typeof statusUpdateSchema>;
export type AuthorityQueueInput = z.infer<typeof authorityQueueSchema>;
export type ResolutionInput = z.infer<typeof resolutionSchema>;
export type VerificationInput = z.infer<typeof verificationSchema>;