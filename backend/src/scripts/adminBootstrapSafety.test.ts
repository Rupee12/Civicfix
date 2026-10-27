import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  determineAdminBootstrapAction,
  parseAdminBootstrapOptions,
  validateAdminBootstrapTarget,
} from "./adminBootstrapSafety.js";

const target = {
  nodeEnvironment: "development",
  targetHost: "127.0.0.1",
  targetDatabase: "civicfix",
  expectedHost: "127.0.0.1",
  expectedDatabase: "civicfix",
  allowRemote: false,
  allowProduction: false,
  productionAuthorized: false,
};

describe("administrator bootstrap safety", () => {
  it("creates only when the target account is missing", () => {
    assert.equal(determineAdminBootstrapAction([], false), "create");
    assert.throws(() => determineAdminBootstrapAction([], true), /requires an existing administrator/);
  });

  it("requires explicit reset mode for an existing administrator", () => {
    assert.throws(() => determineAdminBootstrapAction(["ADMIN"], false), /--reset-existing-admin/);
    assert.equal(determineAdminBootstrapAction(["ADMIN"], true), "reset");
  });

  it("refuses to modify an existing non-admin account", () => {
    assert.throws(() => determineAdminBootstrapAction(["CITIZEN"], false), /not an administrator/);
    assert.throws(() => determineAdminBootstrapAction(["CITIZEN"], true), /not an administrator/);
  });

  it("refuses duplicate matching accounts", () => {
    assert.throws(() => determineAdminBootstrapAction(["ADMIN", "ADMIN"], true), /Multiple accounts/);
  });

  it("requires explicit confirmation and rejects unknown options", () => {
    assert.throws(() => parseAdminBootstrapOptions([]), /--confirm/);
    assert.throws(() => parseAdminBootstrapOptions(["--confirm", "--unexpected"]), /Unsupported/);
    assert.equal(parseAdminBootstrapOptions(["--confirm"]).confirmed, true);
  });

  it("rejects an incorrect database target before database work", () => {
    assert.throws(() => validateAdminBootstrapTarget({
      ...target,
      targetDatabase: "other",
    }), /database/);
  });

  it("requires remote and production authorization", () => {
    const remoteTarget = {
      ...target,
      targetHost: "cluster.example.mongodb.net",
      expectedHost: "cluster.example.mongodb.net",
      targetDatabase: "test",
      expectedDatabase: "test",
    };
    assert.throws(() => validateAdminBootstrapTarget(remoteTarget), /--allow-remote/);
    assert.doesNotThrow(() => validateAdminBootstrapTarget({ ...remoteTarget, allowRemote: true }));
    assert.throws(() => validateAdminBootstrapTarget({
      ...remoteTarget,
      allowRemote: true,
      nodeEnvironment: "production",
    }), /--allow-production/);
    assert.throws(() => validateAdminBootstrapTarget({
      ...remoteTarget,
      allowRemote: true,
      nodeEnvironment: "production",
      allowProduction: true,
    }), /ADMIN_RECOVERY_ALLOW_PRODUCTION/);
    assert.doesNotThrow(() => validateAdminBootstrapTarget({
      ...remoteTarget,
      allowRemote: true,
      nodeEnvironment: "production",
      allowProduction: true,
      productionAuthorized: true,
    }));
  });
});
