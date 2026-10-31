import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Pool } from "pg";

/**
 * Applies pending SQL files once and records them in schema_migrations.
 */
export async function applyMigrations(pool: Pool, directory: string): Promise<void> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
  );
  const fileNames = (await readdir(directory))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
  for (const fileName of fileNames) {
    await applyMigrationFile(pool, directory, fileName);
  }
}

async function applyMigrationFile(pool: Pool, directory: string, fileName: string): Promise<void> {
  const applied = await pool.query("SELECT id FROM schema_migrations WHERE id = $1", [fileName]);
  if ((applied.rowCount ?? 0) > 0) {
    return;
  }
  const sql = await readFile(join(directory, fileName), "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [fileName]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
