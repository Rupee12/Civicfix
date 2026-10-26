import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";
import { IssueModel } from "../models/Issue.js";
import type { SlaTargets } from "../models/SlaConfiguration.js";
import { scheduleNewIssue } from "./issueScheduling.js";

const targets: SlaTargets = { CRITICAL: 24, HIGH: 72, MEDIUM: 168, LOW: 336 };

test("new issue scheduling populates correctly typed SLA fields using configured priority targets", () => {
  const startedAt = new Date("2026-10-26T12:00:00.000Z");
  const scheduling = scheduleNewIssue({
    severity: "HIGH",
    reportCount: 1,
    supportCount: 0,
    affectedPeopleEstimate: 0,
    safetyImpact: "NONE",
  }, startedAt, targets);

  assert.equal(scheduling.priorityLevel, "MEDIUM");
  assert.equal(scheduling.sla.targetHours, targets.MEDIUM);
  assert.equal(scheduling.sla.startedAt.toISOString(), startedAt.toISOString());
  assert.equal(scheduling.sla.dueAt.toISOString(), "2026-11-02T12:00:00.000Z");

  const issue = new IssueModel({
    title: "Broken streetlight",
    description: "The streetlight has been out for several nights.",
    category: "BROKEN_STREETLIGHT",
    reportedBy: new Types.ObjectId(),
    location: { type: "Point", coordinates: [77.6, 12.9] },
    canonicalLocation: { type: "Point", coordinates: [77.6, 12.9] },
    ...scheduling,
    createdAt: startedAt,
  });

  assert.equal(issue.validateSync(), undefined);
  assert.equal(issue.sla?.targetHours, 168);
  assert.ok(issue.sla?.startedAt instanceof Date);
  assert.ok(issue.sla?.dueAt instanceof Date);
});

test("issue validation rejects a missing SLA object before persistence", () => {
  const issue = new IssueModel({
    title: "Broken streetlight",
    description: "The streetlight has been out for several nights.",
    category: "BROKEN_STREETLIGHT",
    reportedBy: new Types.ObjectId(),
    location: { type: "Point", coordinates: [77.6, 12.9] },
    canonicalLocation: { type: "Point", coordinates: [77.6, 12.9] },
  });

  const validationError = issue.validateSync();
  assert.ok(validationError);
  assert.ok(validationError.errors["sla.targetHours"]);
  assert.ok(validationError.errors["sla.startedAt"]);
  assert.ok(validationError.errors["sla.dueAt"]);
});
