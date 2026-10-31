import { adminFetch } from "./admin-fetch";

/**
 * Removes a scheduled appointment and frees the hour.
 */
export async function deleteAppointment(id: string): Promise<void> {
  const response = await adminFetch(`/api/citas/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error("No se pudo eliminar la cita.");
  }
}
