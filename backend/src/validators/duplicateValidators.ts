import { z } from "zod";
import { ISSUE_CATEGORIES } from "../types/issue.js";

const coordinate = (min: number, max: number) => z.coerce.number().finite().min(min).max(max);

export const duplicateCheckSchema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(10).max(2000),
  category: z.enum(ISSUE_CATEGORIES),
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
});

export type DuplicateCheckInput = z.infer<typeof duplicateCheckSchema>;

export const supportIssueSchema = duplicateCheckSchema.extend({
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
}).partial();

export type SupportIssueInput = z.infer<typeof supportIssueSchema>;