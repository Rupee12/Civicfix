import { app } from "./app.js";
import { closeDatabase, connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

const server = app.listen(env.PORT, env.HOST, () => {
  console.log(`CivicFix API listening on ${env.HOST}:${env.PORT}`);
});

void connectDatabase();

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
