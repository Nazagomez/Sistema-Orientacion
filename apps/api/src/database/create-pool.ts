import { Pool } from "pg";

/**
 * Opens a PostgreSQL pool and keeps idle connection errors from crashing the process.
 */
export function createPool(databaseUrl: string): Pool {
  const pool = new Pool({ connectionString: databaseUrl });
  pool.on("error", (error: Error) => {
    console.error(`PostgreSQL pool error: ${error.message}`);
  });
  return pool;
}
