import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseAdminRecoveryOptions,
  resolveAdminRecoveryDatabase,
  validateAdminRecoveryTarget,
} from "./adminRecoverySafety.js";

const localTarget = {
  nodeEnvironment: "development",
  targetHost: "127.0.0.1",
  targetDatabase: "civicfix",
  expectedHost: "127.0.0.1",
  expectedDatabase: "civicfix",
  allowRemote: false,
  allowProduction: false,
  productionAuthorized: false,
};

describe("administrator recovery safety", () => {
  it("requires an explicit confirmation flag and rejects unknown options", () => {
    assert.throws(() => parseAdminRecoveryOptions([]), /--confirm/);
    assert.throws(() => parseAdminRecoveryOptions(["--confirm", "--other"]), /Unsupported/);
    assert.equal(parseAdminRecoveryOptions(["--confirm"]).confirmed, true);
  });

  it("allows an explicitly matched local development target", () => {
    assert.doesNotThrow(() => validateAdminRecoveryTarget(localTarget));
  });

  it("uses the database in an explicit MongoDB URI path", () => {
    assert.equal(
      resolveAdminRecoveryDatabase("mongodb+srv://example.invalid/civicfix?appName=test", "test"),
      "civicfix",
    );
  });

  it("uses the explicitly expected database when a MongoDB URI has no path", () => {
    assert.equal(
      resolveAdminRecoveryDatabase("mongodb+srv://example.invalid/?appName=test", "test"),
      "test",
    );
  });

  it("rejects a URI database that differs from the expected database", () => {
    const database = resolveAdminRecoveryDatabase("mongodb+srv://example.invalid/other", "test");
    assert.throws(() => validateAdminRecoveryTarget({
      ...localTarget,
      targetDatabase: database,
      expectedDatabase: "test",
    }), /does not match/);
  });

  it("requires an expected database when the URI has no path", () => {
    assert.throws(
      () => resolveAdminRecoveryDatabase("mongodb+srv://example.invalid/", ""),
      /Expected database name is required/,
    );
  });

  it("rejects mismatched database names and remote targets without opt-in", () => {
    assert.throws(() => validateAdminRecoveryTarget({ ...localTarget, targetDatabase: "test" }), /does not match/);
    assert.throws(() => validateAdminRecoveryTarget({
      ...localTarget,
      targetHost: "cluster.example.mongodb.net",
      expectedHost: "cluster.example.mongodb.net",
      targetDatabase: "test",
      expectedDatabase: "test",
    }), /--allow-remote/);
    assert.doesNotThrow(() => validateAdminRecoveryTarget({
      ...localTarget,
      targetHost: "cluster.example.mongodb.net",
      expectedHost: "cluster.example.mongodb.net",
      targetDatabase: "test",
      expectedDatabase: "test",
      allowRemote: true,
    }));
    assert.throws(() => validateAdminRecoveryTarget({
      ...localTarget,
      targetHost: "wrong.example.mongodb.net",
      expectedHost: "cluster.example.mongodb.net",
      targetDatabase: "test",
      expectedDatabase: "test",
      allowRemote: true,
    }), /host does not match/);
  });

  it("requires both production authorizations", () => {
    assert.throws(() => validateAdminRecoveryTarget({
      ...localTarget,
      nodeEnvironment: "production",
    }), /--allow-production/);
    assert.throws(() => validateAdminRecoveryTarget({
      ...localTarget,
      nodeEnvironment: "production",
      allowProduction: true,
    }), /ADMIN_RECOVERY_ALLOW_PRODUCTION/);
    assert.doesNotThrow(() => validateAdminRecoveryTarget({
      ...localTarget,
      nodeEnvironment: "production",
      allowProduction: true,
      productionAuthorized: true,
    }));
    assert.throws(() => validateAdminRecoveryTarget({
      ...localTarget,
      allowProduction: true,
      productionAuthorized: true,
    }), /only be used with NODE_ENV=production/);
  });
});
