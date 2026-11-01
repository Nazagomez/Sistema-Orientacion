import { Pool } from "pg";
import { prepareDatabaseConnection } from "./prepare-database-connection.js";

/**
 * Opens a PostgreSQL pool and keeps idle connection errors from crashing the process.
 */
export function createPool(databaseUrl: string): Pool {
  const connection = prepareDatabaseConnection(databaseUrl);
  const pool = new Pool(connection);
  pool.on("error", (error: Error) => {
    console.error(`PostgreSQL pool error: ${error.message}`);
  });
  return pool;
}
