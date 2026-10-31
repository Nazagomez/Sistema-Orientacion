import { adminFetch } from "./admin-fetch";

/**
 * Returns a request from the trash to the active list.
 */
export async function restoreAdminRequest(id: string): Promise<void> {
  const response = await adminFetch(`/api/admin/solicitudes/${id}/restaurar`, { method: "POST" });
  if (response.ok) {
    return;
  }
  const body: unknown = await response.json().catch(() => null);
  const message = typeof body === "object" && body !== null && "message" in body && typeof body.message === "string" ? body.message : null;
  throw new Error(message ?? "No se pudo restaurar la solicitud.");
}
