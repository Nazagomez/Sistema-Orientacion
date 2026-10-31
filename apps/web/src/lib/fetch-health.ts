import type { ServiceHealth } from "./service-health";

/**
 * Loads the API health report through the Vite proxy.
 */
export async function fetchHealth(): Promise<ServiceHealth> {
  const response = await fetch("/api/health");
  const body: unknown = await response.json();
  if (!isServiceHealth(body)) {
    throw new Error("Health response is invalid.");
  }
  return body;
}

function isServiceHealth(value: unknown): value is ServiceHealth {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const status = record.status;
  const database = record.database;
  const checkedAt = record.checkedAt;
  const isStatusValid = status === "ok" || status === "error";
  const isDatabaseValid = database === "up" || database === "down";
  return isStatusValid && isDatabaseValid && typeof checkedAt === "string";
}
