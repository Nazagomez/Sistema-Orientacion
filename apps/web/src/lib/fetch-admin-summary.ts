import { adminFetch } from "./admin-fetch";

type AdminSummary = {
  readonly pendientes: number;
  readonly aprobadas: number;
  readonly noAprobadas: number;
  readonly citasProximas: number;
};

/**
 * Loads the counselor dashboard counts.
 */
export async function fetchAdminSummary(): Promise<AdminSummary> {
  const response = await adminFetch("/api/admin/resumen");
  const body: unknown = await response.json();
  if (!response.ok || !isAdminSummary(body)) {
    throw new Error("No se pudo cargar el resumen.");
  }
  return body;
}

function isAdminSummary(value: unknown): value is AdminSummary {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.pendientes === "number" &&
    typeof record.aprobadas === "number" &&
    typeof record.noAprobadas === "number" &&
    typeof record.citasProximas === "number"
  );
}
