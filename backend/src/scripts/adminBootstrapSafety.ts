import { validateAdminRecoveryTarget } from "./adminRecoverySafety.js";

export interface AdminBootstrapOptions {
  confirmed: boolean;
  resetExistingAdmin: boolean;
  allowRemote: boolean;
  allowProduction: boolean;
}

export type AdminBootstrapAction = "create" | "reset";

export function parseAdminBootstrapOptions(args: string[]): AdminBootstrapOptions {
  const allowedArgs = new Set(["--confirm", "--reset-existing-admin", "--allow-remote", "--allow-production"]);
  const unknownArgs = args.filter((arg) => !allowedArgs.has(arg));
  if (unknownArgs.length) throw new Error("Unsupported administrator bootstrap option.");
  if (new Set(args).size !== args.length) throw new Error("Duplicate administrator bootstrap options are not allowed.");
  if (!args.includes("--confirm")) throw new Error("Pass --confirm to enable the interactive bootstrap flow.");

  return {
    confirmed: true,
    resetExistingAdmin: args.includes("--reset-existing-admin"),
    allowRemote: args.includes("--allow-remote"),
    allowProduction: args.includes("--allow-production"),
  };
}

export function determineAdminBootstrapAction(
  existingRoles: readonly string[],
  resetExistingAdmin: boolean,
): AdminBootstrapAction {
  if (existingRoles.length > 1) throw new Error("Multiple accounts match the administrator email; no changes are allowed.");
  if (existingRoles.length === 0) {
    if (resetExistingAdmin) throw new Error("Reset mode requires an existing administrator account.");
    return "create";
  }
  if (existingRoles[0] !== "ADMIN") {
    throw new Error("The matching account is not an administrator; no changes are allowed.");
  }
  if (!resetExistingAdmin) {
    throw new Error("An administrator already exists; use --reset-existing-admin to replace its password.");
  }
  return "reset";
}

export function validateAdminBootstrapTarget(input: {
  nodeEnvironment: string;
  targetHost: string;
  targetDatabase: string;
  expectedHost: string;
  expectedDatabase: string;
  allowRemote: boolean;
  allowProduction: boolean;
  productionAuthorized: boolean;
}): void {
  validateAdminRecoveryTarget(input);
}
