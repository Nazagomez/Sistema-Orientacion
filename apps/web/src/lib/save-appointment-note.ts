import { adminFetch } from "./admin-fetch";

/**
 * Saves the counselor note that explains the step of the appointment.
 */
export async function saveAppointmentNote(id: string, comentario: string): Promise<void> {
  const response = await adminFetch(`/api/citas/${id}/nota`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comentario }),
  });
  if (response.ok) {
    return;
  }
  const body: unknown = await response.json().catch(() => null);
  const message = typeof body === "object" && body !== null && "message" in body && typeof body.message === "string" ? body.message : null;
  throw new Error(message ?? "No se pudo guardar el comentario.");
}
