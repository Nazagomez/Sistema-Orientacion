import { adminFetch } from "./admin-fetch";

/**
 * Moves an orientation request into the trash. The record stays stored.
 */
export async function deleteAdminRequest(id: string): Promise<void> {
  const response = await adminFetch(`/api/admin/solicitudes/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error("No se pudo eliminar la solicitud.");
  }
}
