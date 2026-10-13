export const ISSUE_CATEGORIES = [
  "GARBAGE",
  "ILLEGAL_DUMPING",
  "BROKEN_STREETLIGHT",
  "OPEN_DRAIN",
  "DAMAGED_ROAD",
  "WATER_LEAKAGE",
  "PUBLIC_SPACE_DAMAGE",
  "OTHER",
] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export const ISSUE_STATUSES = ["REPORTED", "UNDER_REVIEW", "VERIFIED", "REJECTED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "VERIFICATION_PENDING", "CLOSED"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export const SAFETY_IMPACTS = ["NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type SafetyImpact = (typeof SAFETY_IMPACTS)[number];

export const PRIORITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export const REPORT_STATUSES = ["ACTIVE", "MERGED"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface IssueLocation {
  type: "Point";
  coordinates: [number, number];
}

export interface MediaAsset {
  url: string;
  mimeType: string;
  originalName: string;
  size: number;
  providerId?: string;
}