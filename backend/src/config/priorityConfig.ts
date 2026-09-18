import type { IssueSeverity, PriorityLevel, SafetyImpact } from "../types/issue.js";

export const priorityConfig = {
  severityPoints: { LOW: 5, MEDIUM: 12, HIGH: 19, CRITICAL: 25 } satisfies Record<IssueSeverity, number>,
  reportThresholds: [[0, 0], [1, 2], [5, 8], [10, 12], [20, 16], [30, 20]] as const,
  supportThresholds: [[0, 0], [1, 3], [3, 6], [6, 9], [11, 12], [21, 15]] as const,
  ageThresholdsDays: [[0, 2], [1, 5], [4, 8], [8, 11], [15, 13], [30, 15]] as const,
  affectedPeopleThresholds: [[0, 2], [11, 4], [51, 6], [101, 8], [500, 10]] as const,
  safetyPoints: { NONE: 0, LOW: 4, MEDIUM: 8, HIGH: 12, CRITICAL: 15 } satisfies Record<SafetyImpact, number>,
  levelThresholds: { LOW: 0, MEDIUM: 25, HIGH: 50, CRITICAL: 75 } satisfies Record<PriorityLevel, number>,
} as const;