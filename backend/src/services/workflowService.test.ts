import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isValidStatusTransition } from "./workflowService.js";

describe("Phase 4A status transitions", () => {
  it("allows only the defined workflow transitions", () => {
    assert.equal(isValidStatusTransition("REPORTED", "UNDER_REVIEW"), true);
    assert.equal(isValidStatusTransition("UNDER_REVIEW", "VERIFIED"), true);
    assert.equal(isValidStatusTransition("UNDER_REVIEW", "REJECTED"), true);
    assert.equal(isValidStatusTransition("VERIFIED", "ASSIGNED"), true);
    assert.equal(isValidStatusTransition("ASSIGNED", "IN_PROGRESS"), true);
    assert.equal(isValidStatusTransition("IN_PROGRESS", "RESOLVED"), true);
    assert.equal(isValidStatusTransition("RESOLVED", "VERIFICATION_PENDING"), true);
  });

  it("rejects arbitrary jumps and terminal re-entry", () => {
    assert.equal(isValidStatusTransition("REPORTED", "IN_PROGRESS"), false);
    assert.equal(isValidStatusTransition("REPORTED", "CLOSED"), false);
    assert.equal(isValidStatusTransition("REJECTED", "UNDER_REVIEW"), false);
    assert.equal(isValidStatusTransition("IN_PROGRESS", "VERIFIED"), false);
    assert.equal(isValidStatusTransition("IN_PROGRESS", "VERIFICATION_PENDING"), false);
    assert.equal(isValidStatusTransition("RESOLVED", "CLOSED"), false);
  });
});