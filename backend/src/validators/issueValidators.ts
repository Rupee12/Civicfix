import { z } from "zod";
import { ISSUE_CATEGORIES, ISSUE_SEVERITIES, ISSUE_STATUSES, PRIORITY_LEVELS, SAFETY_IMPACTS } from "../types/issue.js";

const coordinate = (min: number, max: number) => z.coerce.number().finite().min(min).max(max);
const positiveInteger = z.coerce.number().int().positive();

export const createIssueSchema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(10).max(2000),
  category: z.enum(ISSUE_CATEGORIES),
  subcategory: z.string().trim().max(100).optional(),
  severity: z.enum(ISSUE_SEVERITIES).default("MEDIUM"),
  safetyImpact: z.enum(SAFETY_IMPACTS).default("NONE"),
  affectedPeopleEstimate: z.coerce.number().int().min(0).max(100000).default(0),
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
  address: z.string().trim().max(250).optional(),
  area: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
});

export const listIssuesSchema = z.object({
  page: positiveInteger.default(1),
  limit: positiveInteger.max(50).default(20),
  category: z.enum(ISSUE_CATEGORIES).optional(),
  status: z.enum(ISSUE_STATUSES).optional(),
  severity: z.enum(ISSUE_SEVERITIES).optional(),
  sort: z.enum(["newest", "oldest", "priority"]).default("newest"),
  priorityLevel: z.enum(PRIORITY_LEVELS).optional(),
});

export const nearbyIssuesSchema = z.object({
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
  radius: positiveInteger.max(5000).default(1000),
  limit: positiveInteger.max(50).default(20),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type ListIssuesInput = z.infer<typeof listIssuesSchema>;
export type NearbyIssuesInput = z.infer<typeof nearbyIssuesSchema>;