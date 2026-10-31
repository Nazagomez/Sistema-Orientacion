import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./create-app.js";
import { loadEnvironmentFile } from "./config/load-environment-file.js";
import { readEnvironment } from "./config/read-environment.js";
import { attachWebClient } from "./serve-web.js";
import { applyMigrations } from "./database/apply-migrations.js";
import { createPool } from "./database/create-pool.js";

/**
 * Starts the API after the database schema is current.
 */
async function startServer(): Promise<void> {
  loadEnvironmentFile();
  const environment = readEnvironment(process.env);
  const pool = createPool(environment.databaseUrl);
  const sourceDirectory = dirname(fileURLToPath(import.meta.url));
  const migrationsDirectory = resolve(sourceDirectory, "../../../database/migrations");
  await applyMigrations(pool, migrationsDirectory);
  const app = createApp({
    corsOrigin: environment.corsOrigin,
    database: pool,
  });
  attachWebClient(app, resolve(sourceDirectory, "../../web/dist"));
  const server = app.listen(environment.port, () => {
    console.log(`API listening on port ${environment.port}`);
  });
  function closeServer(): void {
    server.close(() => {
      void pool.end();
    });
  }
  process.on("SIGINT", closeServer);
  process.on("SIGTERM", closeServer);
}

void startServer();
