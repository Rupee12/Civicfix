import { priorityConfig } from "../config/priorityConfig.js";
import type { IssueSeverity, PriorityLevel, SafetyImpact } from "../types/issue.js";

export interface PriorityInput {
  severity: IssueSeverity;
  reportCount: number;
  supportCount: number;
  createdAt: Date | string;
  affectedPeopleEstimate: number;
  safetyImpact: SafetyImpact;
}

export interface PriorityResult {
  score: number;
  level: PriorityLevel;
  breakdown: { severity: number; communityReports: number; communitySupport: number; age: number; affectedPeople: number; safety: number };
  explanation: string[];
}

function thresholdValue(value: number, thresholds: readonly (readonly [number, number])[]) {
  const boundedValue = Math.max(0, value);
  for (let index = thresholds.length - 1; index >= 0; index -= 1) {
    const [minimum, points] = thresholds[index];
    if (boundedValue >= minimum) return points;
  }
  return 0;
}

function levelForScore(score: number): PriorityLevel {
  if (score >= priorityConfig.levelThresholds.CRITICAL) return "CRITICAL";
  if (score >= priorityConfig.levelThresholds.HIGH) return "HIGH";
  if (score >= priorityConfig.levelThresholds.MEDIUM) return "MEDIUM";
  return "LOW";
}

export function calculatePriority(issue: PriorityInput, now = new Date()): PriorityResult {
  const ageDays = Math.max(0, (now.getTime() - new Date(issue.createdAt).getTime()) / 86_400_000);
  const breakdown = {
    severity: priorityConfig.severityPoints[issue.severity],
    communityReports: thresholdValue(issue.reportCount, priorityConfig.reportThresholds),
    communitySupport: thresholdValue(issue.supportCount, priorityConfig.supportThresholds),
    age: thresholdValue(ageDays, priorityConfig.ageThresholdsDays),
      affectedPeople: thresholdValue(issue.affectedPeopleEstimate, priorityConfig.affectedPeopleThresholds),
    safety: priorityConfig.safetyPoints[issue.safetyImpact],
  };
  const score = Math.max(0, Math.min(100, Object.values(breakdown).reduce((total, points) => total + points, 0)));
  const reportBand = issue.reportCount >= 30 ? "30+ citizen reports" : `${issue.reportCount} citizen reports`;
  const supportBand = issue.supportCount >= 21 ? "21+ supporters" : `${issue.supportCount} supporters`;
  const explanation = [
    `${issue.severity[0] + issue.severity.slice(1).toLowerCase()} severity: +${breakdown.severity}`,
    `${reportBand}: +${breakdown.communityReports}`,
    `${supportBand}: +${breakdown.communitySupport}`,
    `${Math.floor(ageDays)} days unresolved: +${breakdown.age}`,
    `${issue.affectedPeopleEstimate} affected people: +${breakdown.affectedPeople}`,
    `${issue.safetyImpact[0] + issue.safetyImpact.slice(1).toLowerCase()} safety impact: +${breakdown.safety}`,
  ];
  return { score, level: levelForScore(score), breakdown, explanation };
}