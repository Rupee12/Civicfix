import { z } from "zod";
import { ISSUE_CATEGORIES, ISSUE_STATUSES, PRIORITY_LEVELS } from "../types/issue.js";

export const analyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});
export const reportQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(ISSUE_STATUSES).optional(),
  priorityLevel: z.enum(PRIORITY_LEVELS).optional(),
  category: z.enum(ISSUE_CATEGORIES).optional(),
  departmentId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  assignedTo: z.string().regex(/^[a-f\d]{24}$/i).optional(),
}).refine((value) => !value.startDate || !value.endDate || value.startDate <= value.endDate, { message: "startDate must be before endDate" });

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type ReportQuery = z.infer<typeof reportQuerySchema>;
