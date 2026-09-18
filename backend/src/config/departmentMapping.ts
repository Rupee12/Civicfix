import type { IssueCategory } from "../types/issue.js";

export const categoryDepartmentCodes: Partial<Record<IssueCategory, string>> = {
  GARBAGE: "SANITATION",
  ILLEGAL_DUMPING: "SANITATION",
  BROKEN_STREETLIGHT: "ELECTRICAL",
  OPEN_DRAIN: "DRAINAGE",
  DAMAGED_ROAD: "ROADS",
  WATER_LEAKAGE: "WATER",
  PUBLIC_SPACE_DAMAGE: "PUBLIC_WORKS",
};