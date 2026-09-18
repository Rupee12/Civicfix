import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { duplicateConfidence, textSimilarity } from "./duplicateDetectionService.js";

describe("duplicate detection scoring", () => {
  it("scores nearby same-category similar text highly", () => {
    const result = duplicateConfidence(50, 500, "GARBAGE", "GARBAGE", "Garbage dumped near park", "Large trash pile", "Garbage near park", "Trash dumped beside park");
    assert.ok(result.score >= 0.8);
    assert.equal(result.confidence, "HIGH");
  });

  it("does not suggest a different category at the same location", () => {
    const result = duplicateConfidence(0, 500, "BROKEN_STREETLIGHT", "GARBAGE", "Broken streetlight", "Light is out", "Garbage pile", "Trash near park");
    assert.ok(result.score < 0.5);
    assert.equal(result.confidence, "LOW");
  });

  it("reduces confidence as distance increases", () => {
    const result = duplicateConfidence(500, 500, "GARBAGE", "GARBAGE", "Garbage near park", "Trash pile", "Garbage near park", "Trash pile");
    assert.ok(result.score < 0.8);
  });

  it("recognizes normalized civic text overlap", () => {
    assert.ok(textSimilarity("garbage dumped near park", "trash pile beside park") > 0.2);
  });
});