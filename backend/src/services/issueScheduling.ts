import { calculatePriority, type PriorityInput } from "./priorityService.js";
import { slaForPriority } from "./slaService.js";
import type { SlaTargets } from "../models/SlaConfiguration.js";

type NewIssuePriorityInput = Pick<
  PriorityInput,
  "severity" | "reportCount" | "supportCount" | "affectedPeopleEstimate" | "safetyImpact"
>;

export function scheduleNewIssue(input: NewIssuePriorityInput, startedAt: Date, targets: SlaTargets) {
  const priority = calculatePriority({ ...input, createdAt: startedAt }, startedAt);
  return {
    priorityScore: priority.score,
    priorityLevel: priority.level,
    priorityBreakdown: priority.breakdown,
    priorityUpdatedAt: startedAt,
    sla: slaForPriority(priority.level, startedAt, targets),
  };
}
