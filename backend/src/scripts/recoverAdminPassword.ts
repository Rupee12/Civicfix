import mongoose from "mongoose";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { env } from "../config/env.js";
import { UserModel } from "../models/User.js";
import { hashPassword } from "../services/passwordService.js";
import {
  parseAdminRecoveryOptions,
  resolveAdminRecoveryDatabase,
  validateAdminRecoveryTarget,
} from "./adminRecoverySafety.js";

class RecoveryError extends Error {}

const ADMIN_EMAIL = "admin@civicfix.local";

function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    stdout.write(prompt);
    if (!stdin.isTTY || !stdin.setRawMode) {
      reject(new RecoveryError("Run recovery from an interactive terminal so password input remains hidden."));
      return;
    }

    let value = "";
    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
    };
    const onData = (chunk: Buffer) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") {
          cleanup();
          reject(new RecoveryError("Recovery cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          cleanup();
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
        } else if (character >= " ") {
          value += character;
        }
      }
    };

    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

async function recoverAdminPassword(): Promise<void> {
  const terminal = createInterface({ input: stdin, output: stdout });
  try {
    const options = parseAdminRecoveryOptions(process.argv.slice(2));
    if (!stdin.isTTY || !stdout.isTTY) {
      throw new RecoveryError("Run recovery from an interactive terminal so target and password confirmations remain private.");
    }

    const targetUri = new URL(env.MONGODB_URI);
    const targetHost = targetUri.hostname.toLowerCase();
    const localHosts = ["localhost", "127.0.0.1", "::1"];
    const expectedHost = process.env.ADMIN_RECOVERY_EXPECTED_HOST?.trim().toLowerCase()
      ?? (localHosts.includes(targetHost) ? targetHost : "");
    const expectedDatabase = process.env.ADMIN_RECOVERY_EXPECTED_DATABASE?.trim()
      ?? (localHosts.includes(targetHost) ? "civicfix" : "");

    if (!expectedHost || !expectedDatabase) {
      throw new RecoveryError("Remote recovery requires explicit ADMIN_RECOVERY_EXPECTED_HOST and ADMIN_RECOVERY_EXPECTED_DATABASE values.");
    }

    let targetDatabase: string;
    try {
      targetDatabase = resolveAdminRecoveryDatabase(env.MONGODB_URI, expectedDatabase);
    } catch (error) {
      throw new RecoveryError(error instanceof Error ? error.message : "Database target validation failed.");
    }

    const validateTarget = (database: string) => {
      try {
        validateAdminRecoveryTarget({
          nodeEnvironment: env.NODE_ENV,
          targetHost,
          targetDatabase: database,
          expectedHost,
          expectedDatabase,
          allowRemote: options.allowRemote,
          allowProduction: options.allowProduction,
          productionAuthorized: process.env.ADMIN_RECOVERY_ALLOW_PRODUCTION === "true",
        });
      } catch (error) {
        throw new RecoveryError(error instanceof Error ? error.message : "Database target validation failed.");
      }
    };

    validateTarget(targetDatabase);
    try {
      // Pathless URIs use the explicitly validated target, not the driver's implicit default.
      await mongoose.connect(env.MONGODB_URI, { dbName: targetDatabase, serverSelectionTimeoutMS: 5000 });
    } catch {
      throw new RecoveryError("Could not connect to the configured MongoDB target; no password was changed.");
    }
    validateTarget(mongoose.connection.name);

    stdout.write(`Target: ${env.NODE_ENV} / ${targetHost} / ${mongoose.connection.name} / ${ADMIN_EMAIL}\n`);
    const confirmation = await terminal.question(
      `Type RESET ${env.NODE_ENV} ${targetHost}/${mongoose.connection.name} ${ADMIN_EMAIL} to continue: `,
    );
    if (confirmation !== `RESET ${env.NODE_ENV} ${targetHost}/${mongoose.connection.name} ${ADMIN_EMAIL}`) {
      throw new RecoveryError("Target confirmation did not match; no password was changed.");
    }

    terminal.close();
    const admins = await UserModel.find({ email: ADMIN_EMAIL }).limit(2);
    if (admins.length !== 1) {
      throw new RecoveryError(`Expected exactly one account for ${ADMIN_EMAIL}; ${admins.length > 1 ? "multiple accounts matched" : "no account matched"}. No changes were made.`);
    }
    const admin = admins[0];
    if (admin.role !== "ADMIN") {
      throw new RecoveryError("The matching account does not have the ADMIN role; no changes were made.");
    }
    if (!admin.isActive) throw new RecoveryError("The matching administrator account is inactive; no password was changed.");

    const password = await readHidden("New temporary password (input hidden): ");
    const confirmationPassword = await readHidden("Confirm temporary password (input hidden): ");
    if (password !== confirmationPassword) throw new RecoveryError("Password confirmation did not match; no password was changed.");
    if (password.length < 8 || password.length > 128) throw new RecoveryError("Password must be between 8 and 128 characters.");

    admin.passwordHash = await hashPassword(password);
    try {
      await admin.save();
    } catch {
      throw new RecoveryError("Could not save the password update; check the selected database and access.");
    }
    stdout.write("Password updated for the existing administrator account. Change it immediately after signing in.\n");
  } catch (error) {
    const message = error instanceof RecoveryError
      ? error.message
      : error instanceof Error && error.message.includes("--confirm")
        ? error.message
        : "An unexpected recovery error occurred; no credentials were logged.";
    console.error(`Admin password recovery failed: ${message}`);
    process.exitCode = 1;
  } finally {
    terminal.close();
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.disconnect();
      } catch {
        console.error("Could not close the recovery database connection cleanly.");
        process.exitCode = 1;
      }
    }
  }
}

void recoverAdminPassword();
