import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "../utils/apiError.js";
import { passwordChangeSchema } from "../validators/authValidators.js";
import { changePasswordForAccount } from "./authService.js";
import { hashPassword, verifyPassword } from "./passwordService.js";

const currentPassword = "ExistingPassword123";
const newPassword = "UpdatedPassword456";

describe("password change", () => {
  it("stores a hash that verifies the new password and rejects the old password", async () => {
    let saves = 0;
    const account = {
      isActive: true,
      passwordHash: await hashPassword(currentPassword),
      save: async () => { saves += 1; },
    };

    await changePasswordForAccount(account, {
      currentPassword,
      newPassword,
      confirmPassword: newPassword,
    });

    assert.equal(saves, 1);
    assert.equal(await verifyPassword(newPassword, account.passwordHash), true);
    assert.equal(await verifyPassword(currentPassword, account.passwordHash), false);
  });

  it("rejects an incorrect current password without changing the hash", async () => {
    const passwordHash = await hashPassword(currentPassword);
    const account = { isActive: true, passwordHash, save: async () => undefined };

    await assert.rejects(
      changePasswordForAccount(account, {
        currentPassword: "IncorrectPassword123",
        newPassword,
        confirmPassword: newPassword,
      }),
      (error: unknown) => error instanceof ApiError && error.code === "CURRENT_PASSWORD_INVALID",
    );
    assert.equal(account.passwordHash, passwordHash);
  });

  it("rejects reusing the current password", async () => {
    const account = { isActive: true, passwordHash: await hashPassword(currentPassword), save: async () => undefined };

    await assert.rejects(
      changePasswordForAccount(account, {
        currentPassword,
        newPassword: currentPassword,
        confirmPassword: currentPassword,
      }),
      (error: unknown) => error instanceof ApiError && error.code === "PASSWORD_REUSE",
    );
  });

  it("requires complete fields, an allowed password length, and matching confirmation", () => {
    assert.equal(passwordChangeSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword: newPassword,
    }).success, true);
    assert.equal(passwordChangeSchema.safeParse({
      currentPassword,
      newPassword: "short",
      confirmPassword: "short",
    }).success, false);
    assert.equal(passwordChangeSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword: "DifferentPassword789",
    }).success, false);
    assert.equal(passwordChangeSchema.safeParse({ currentPassword }).success, false);
  });
});
