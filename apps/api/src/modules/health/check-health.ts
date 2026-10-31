import type { HealthDatabase } from "../../database/health-database.js";

type HealthReport = {
  readonly status: "ok" | "error";
  readonly database: "up" | "down";
  readonly checkedAt: string;
};

/**
 * Checks that PostgreSQL accepts a trivial query.
 */
export async function checkHealth(database: HealthDatabase): Promise<HealthReport> {
  const checkedAt = new Date().toISOString();
  try {
    await database.query("SELECT 1");
    return { status: "ok", database: "up", checkedAt };
  } catch {
    return { status: "error", database: "down", checkedAt };
  }
}
