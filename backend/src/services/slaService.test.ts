import assert from "node:assert/strict";
import test from "node:test";
import { slaForPriority } from "./slaService.js";

test("SLA deadlines use the configured priority duration from the supplied UTC start", () => {
  const startedAt = new Date("2026-01-01T00:00:00.000Z");
  const sla = slaForPriority("CRITICAL", startedAt);
  assert.equal(sla.targetHours, 24);
  assert.equal(sla.startedAt.toISOString(), startedAt.toISOString());
  assert.equal(sla.dueAt.toISOString(), "2026-01-02T00:00:00.000Z");
  assert.equal(sla.escalationLevel, 0);
});
