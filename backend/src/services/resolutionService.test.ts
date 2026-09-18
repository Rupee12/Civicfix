import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Types } from "mongoose";
import { canResolveIssue } from "./resolutionService.js";

describe("resolution authorization", () => {
  const authorityId = new Types.ObjectId().toString();
  it("allows an assigned active authority and admin in progress", () => {
    assert.equal(canResolveIssue("AUTHORITY", authorityId, new Types.ObjectId(authorityId), true, "IN_PROGRESS"), true);
    assert.equal(canResolveIssue("ADMIN", new Types.ObjectId().toString(), undefined, true, "IN_PROGRESS"), true);
  });
  it("blocks citizens, inactive actors, unrelated authorities, and wrong states", () => {
    assert.equal(canResolveIssue("CITIZEN", authorityId, new Types.ObjectId(authorityId), true, "IN_PROGRESS"), false);
    assert.equal(canResolveIssue("AUTHORITY", authorityId, new Types.ObjectId().toString() as never, true, "IN_PROGRESS"), false);
    assert.equal(canResolveIssue("AUTHORITY", authorityId, new Types.ObjectId(authorityId), false, "IN_PROGRESS"), false);
    assert.equal(canResolveIssue("AUTHORITY", authorityId, new Types.ObjectId(authorityId), true, "ASSIGNED"), false);
  });
});
