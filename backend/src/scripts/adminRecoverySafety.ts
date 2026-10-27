const LOCAL_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

export interface AdminRecoveryOptions {
  confirmed: boolean;
  allowRemote: boolean;
  allowProduction: boolean;
}

export function resolveAdminRecoveryDatabase(uri: string, expectedDatabase: string): string {
  if (!expectedDatabase.trim()) throw new Error("Expected database name is required.");

  const uriDatabase = decodeURIComponent(new URL(uri).pathname.replace(/^\/+/, ""));
  return uriDatabase || expectedDatabase.trim();
}

export function parseAdminRecoveryOptions(args: string[]): AdminRecoveryOptions {
  const allowedArgs = new Set(["--confirm", "--allow-remote", "--allow-production"]);
  const unknownArgs = args.filter((arg) => !allowedArgs.has(arg));
  if (unknownArgs.length) throw new Error("Unsupported recovery option.");
  if (new Set(args).size !== args.length) throw new Error("Duplicate recovery options are not allowed.");

  const confirmed = args.includes("--confirm");
  if (!confirmed) throw new Error("Pass --confirm to enable the interactive recovery flow.");

  return {
    confirmed,
    allowRemote: args.includes("--allow-remote"),
    allowProduction: args.includes("--allow-production"),
  };
}

export function validateAdminRecoveryTarget({
  nodeEnvironment,
  targetHost,
  targetDatabase,
  expectedHost,
  expectedDatabase,
  allowRemote,
  allowProduction,
  productionAuthorized,
}: {
  nodeEnvironment: string;
  targetHost: string;
  targetDatabase: string;
  expectedHost: string;
  expectedDatabase: string;
  allowRemote: boolean;
  allowProduction: boolean;
  productionAuthorized: boolean;
}): void {
  if (!expectedHost || !expectedDatabase) throw new Error("Expected database host and name are required.");
  if (targetHost.toLowerCase() !== expectedHost.toLowerCase()) {
    throw new Error("Configured database host does not match the expected recovery host.");
  }
  if (targetDatabase !== expectedDatabase) {
    throw new Error("Configured database does not match the expected recovery database.");
  }

  const isLocal = LOCAL_HOSTS.has(targetHost.toLowerCase());
  if (!isLocal && !allowRemote) {
    throw new Error("Remote database recovery requires --allow-remote and explicit target confirmation.");
  }

  if (nodeEnvironment === "production") {
    if (!allowProduction || !productionAuthorized) {
      throw new Error("Production recovery requires --allow-production and ADMIN_RECOVERY_ALLOW_PRODUCTION=true.");
    }
  } else if (allowProduction || productionAuthorized) {
    throw new Error("Production authorization must only be used with NODE_ENV=production.");
  }
}
