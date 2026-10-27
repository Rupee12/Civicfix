import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { app } from "../app.js";
import { env } from "../config/env.js";

describe("administrator password endpoint", () => {
  it("rejects unauthenticated requests", async () => {
    const server = app.listen(0);
    await once(server, "listening");
    try {
      const address = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${address.port}/api/admin/me/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: "ExistingPassword123",
          newPassword: "UpdatedPassword456",
          confirmPassword: "UpdatedPassword456",
        }),
      });
      assert.equal(response.status, 401);
    } finally {
      server.close();
      await once(server, "close");
    }
  });

  it("rejects authenticated non-administrators", async () => {
    const token = jwt.sign({ userId: "test-user", role: "CITIZEN" }, env.JWT_SECRET);
    const server = app.listen(0);
    await once(server, "listening");
    try {
      const address = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${address.port}/api/admin/me/password`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: "ExistingPassword123",
          newPassword: "UpdatedPassword456",
          confirmPassword: "UpdatedPassword456",
        }),
      });
      assert.equal(response.status, 403);
    } finally {
      server.close();
      await once(server, "close");
    }
  });
});
