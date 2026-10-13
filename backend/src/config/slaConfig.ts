import type { PriorityLevel } from "../types/issue.js";

export const slaHours: Record<PriorityLevel, number> = {
  CRITICAL: 24,
  HIGH: 72,
  MEDIUM: 168,
  LOW: 336,
};
