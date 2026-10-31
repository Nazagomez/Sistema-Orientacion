import type { AdminRequestDetail } from "./admin-request-detail";
import { adminFetch } from "./admin-fetch";

/**
 * Loads one orientation request for the counselor.
 */
export async function fetchAdminRequest(id: string): Promise<AdminRequestDetail | null> {
  const response = await adminFetch(`/api/admin/solicitudes/${id}`);
  if (response.status === 404) {
    return null;
  }
  const body: unknown = await response.json();
  if (!response.ok || !isDetail(body)) {
    throw new Error("No se pudo cargar la solicitud.");
  }
  return body;
}

function isDetail(value: unknown): value is AdminRequestDetail {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && Array.isArray(record.temas) && Array.isArray(record.temaCodigos) && Array.isArray(record.historial) && typeof record.eliminada === "boolean";
}
