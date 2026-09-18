import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculatePriority } from "./priorityService.js";

const base = { severity: "MEDIUM" as const, reportCount: 1, supportCount: 0, createdAt: new Date(), affectedPeopleEstimate: 0, safetyImpact: "NONE" as const };

describe("priority calculation", () => {
  it("keeps the breakdown total equal to the score and stays within bounds", () => {
    const result = calculatePriority({ ...base, severity: "CRITICAL", reportCount: 30, supportCount: 21, affectedPeopleEstimate: 500, safetyImpact: "CRITICAL" }, new Date());
    assert.equal(result.score, Object.values(result.breakdown).reduce((total, points) => total + points, 0));
    assert.ok(result.score >= 0 && result.score <= 100);
    assert.equal(result.level, "CRITICAL");
  });

  it("increases with severity, reports, support, age, population, and safety", () => {
    const low = calculatePriority(base, new Date());
    const severe = calculatePriority({ ...base, severity: "CRITICAL", reportCount: 30, supportCount: 21, createdAt: new Date(Date.now() - 31 * 86_400_000), affectedPeopleEstimate: 500, safetyImpact: "CRITICAL" });
    assert.ok(severe.score > low.score);
    assert.ok(calculatePriority({ ...base, severity: "CRITICAL" }).score > calculatePriority({ ...base, severity: "LOW" }).score);
    assert.ok(calculatePriority({ ...base, reportCount: 30 }).score >= calculatePriority({ ...base, reportCount: 1 }).score);
    assert.ok(calculatePriority({ ...base, supportCount: 21 }).score >= calculatePriority({ ...base, supportCount: 0 }).score);
    assert.ok(calculatePriority({ ...base, affectedPeopleEstimate: 500 }).score >= low.score);
    assert.ok(calculatePriority({ ...base, safetyImpact: "CRITICAL" }).score >= low.score);
  });

  it("uses configured level boundaries", () => {
    assert.equal(calculatePriority({ ...base, severity: "CRITICAL", reportCount: 30, supportCount: 21, affectedPeopleEstimate: 500, safetyImpact: "CRITICAL" }).level, "CRITICAL");
    assert.equal(calculatePriority(base).level, "LOW");
  });
});