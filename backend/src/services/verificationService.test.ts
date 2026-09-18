import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { verificationConfig } from "../config/verificationConfig.js";
import { verificationOutcome } from "./verificationService.js";

describe("citizen verification thresholds", () => {
  it("keeps an issue pending until a configured threshold is reached", () => {
    assert.equal(verificationOutcome(verificationConfig.positiveVotesToClose - 1, 0), undefined);
    assert.equal(verificationOutcome(0, verificationConfig.negativeVotesToReopen - 1), undefined);
  });

  it("closes on enough resolved votes and reopens on enough negative votes", () => {
    assert.equal(verificationOutcome(verificationConfig.positiveVotesToClose, 0), "CLOSED");
    assert.equal(verificationOutcome(0, verificationConfig.negativeVotesToReopen), "IN_PROGRESS");
  });
});
