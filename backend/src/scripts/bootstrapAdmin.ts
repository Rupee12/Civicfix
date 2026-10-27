import mongoose from "mongoose";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { env } from "../config/env.js";
import { UserModel } from "../models/User.js";
import { hashPassword } from "../services/passwordService.js";
import { resolveAdminRecoveryDatabase } from "./adminRecoverySafety.js";
import {
  determineAdminBootstrapAction,
  parseAdminBootstrapOptions,
  validateAdminBootstrapTarget,
} from "./adminBootstrapSafety.js";

class BootstrapError extends Error {}

const ADMIN_EMAIL = "admin@civicfix.local";
const ADMIN_NAME = "CivicFix Administrator";

function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    stdout.write(prompt);
    if (!stdin.isTTY || !stdin.setRawMode) {
      reject(new BootstrapError("Run bootstrap from an interactive terminal so password input remains hidden."));
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
          reject(new BootstrapError("Bootstrap cancelled."));
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

async function bootstrapAdmin(): Promise<void> {
  const terminal = createInterface({ input: stdin, output: stdout });
  try {
    const options = parseAdminBootstrapOptions(process.argv.slice(2));
    if (!stdin.isTTY || !stdout.isTTY) {
      throw new BootstrapError("Run bootstrap from an interactive terminal so target and password confirmations remain private.");
    }

    const uri = new URL(env.MONGODB_URI);
    const targetHost = uri.hostname.toLowerCase();
    const localHosts = ["localhost", "127.0.0.1", "::1"];
    const expectedHost = process.env.ADMIN_RECOVERY_EXPECTED_HOST?.trim().toLowerCase()
      ?? (localHosts.includes(targetHost) ? targetHost : "");
    const expectedDatabase = process.env.ADMIN_RECOVERY_EXPECTED_DATABASE?.trim()
      ?? (localHosts.includes(targetHost) ? "civicfix" : "");
    if (!expectedHost || !expectedDatabase) {
      throw new BootstrapError("Remote bootstrap requires explicit ADMIN_RECOVERY_EXPECTED_HOST and ADMIN_RECOVERY_EXPECTED_DATABASE values.");
    }

    let targetDatabase: string;
    try {
      targetDatabase = resolveAdminRecoveryDatabase(env.MONGODB_URI, expectedDatabase);
      validateAdminBootstrapTarget({
        nodeEnvironment: env.NODE_ENV,
        targetHost,
        targetDatabase,
        expectedHost,
        expectedDatabase,
        allowRemote: options.allowRemote,
        allowProduction: options.allowProduction,
        productionAuthorized: process.env.ADMIN_RECOVERY_ALLOW_PRODUCTION === "true",
      });
    } catch (error) {
      throw new BootstrapError(error instanceof Error ? error.message : "Database target validation failed.");
    }

    const actionLabel = options.resetExistingAdmin ? "explicit admin password reset" : "admin creation";
    const confirmationPhrase = `BOOTSTRAP ${actionLabel} ${env.NODE_ENV} ${targetHost}/${targetDatabase} ${ADMIN_EMAIL}`;
    stdout.write(`Target: ${env.NODE_ENV} / ${targetHost} / ${targetDatabase} / ${ADMIN_EMAIL}\n`);
    const confirmation = await terminal.question(`Type ${confirmationPhrase} to continue: `);
    if (confirmation !== confirmationPhrase) {
      throw new BootstrapError("Target confirmation did not match; no changes were made.");
    }

    try {
      await mongoose.connect(env.MONGODB_URI, { dbName: targetDatabase, serverSelectionTimeoutMS: 5000 });
    } catch {
      throw new BootstrapError("Could not connect to the configured MongoDB target; no changes were made.");
    }
    try {
      validateAdminBootstrapTarget({
        nodeEnvironment: env.NODE_ENV,
        targetHost,
        targetDatabase: mongoose.connection.name,
        expectedHost,
        expectedDatabase,
        allowRemote: options.allowRemote,
        allowProduction: options.allowProduction,
        productionAuthorized: process.env.ADMIN_RECOVERY_ALLOW_PRODUCTION === "true",
      });
    } catch (error) {
      throw new BootstrapError(error instanceof Error ? error.message : "Connected database target validation failed.");
    }

    const matches = await UserModel.find({ email: ADMIN_EMAIL }).limit(2);
    let action: ReturnType<typeof determineAdminBootstrapAction>;
    try {
      action = determineAdminBootstrapAction(matches.map((user) => user.role), options.resetExistingAdmin);
    } catch (error) {
      throw new BootstrapError(error instanceof Error ? error.message : "Administrator account state is unsafe.");
    }
    if (action === "reset" && !matches[0].isActive) {
      throw new BootstrapError("The existing administrator is inactive; no changes were made.");
    }

    const password = await readHidden("Temporary administrator password (input hidden): ");
    const passwordConfirmation = await readHidden("Confirm temporary administrator password (input hidden): ");
    if (password !== passwordConfirmation) throw new BootstrapError("Password confirmation did not match; no changes were made.");
    if (password.length < 8 || password.length > 128) {
      throw new BootstrapError("Password must be between 8 and 128 characters.");
    }

    const passwordHash = await hashPassword(password);
    if (action === "create") {
      await UserModel.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        passwordHash,
        role: "ADMIN",
        isActive: true,
      });
      stdout.write("Created the active administrator account. Change the temporary password after signing in.\n");
    } else {
      matches[0].passwordHash = passwordHash;
      await matches[0].save();
      stdout.write("Updated the existing administrator password. Change the temporary password after signing in.\n");
    }
  } catch (error) {
    const message = error instanceof BootstrapError
      ? error.message
      : error instanceof Error && error.message.includes("--confirm")
        ? error.message
        : "An unexpected administrator bootstrap error occurred; no credentials were logged.";
    console.error(`Administrator bootstrap failed: ${message}`);
    process.exitCode = 1;
  } finally {
    terminal.close();
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.disconnect();
      } catch {
        console.error("Could not close the bootstrap database connection cleanly.");
        process.exitCode = 1;
      }
    }
  }
}

void bootstrapAdmin();
