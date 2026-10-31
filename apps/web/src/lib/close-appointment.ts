import { adminFetch } from "./admin-fetch";

export type AppointmentAction = "completar" | "no-asistio" | "cancelar";

/**
 * Closes a scheduled appointment from the counselor calendar.
 */
export async function closeAppointment(id: string, accion: AppointmentAction): Promise<void> {
  const response = await adminFetch(`/api/citas/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accion }),
  });
  if (response.ok) {
    return;
  }
  const body: unknown = await response.json().catch(() => null);
  const message = readMessage(body);
  throw new Error(message ?? "No se pudo actualizar la cita.");
}

function readMessage(value: unknown): string | null {
  if (typeof value === "object" && value !== null && "message" in value && typeof value.message === "string") {
    return value.message;
  }
  return null;
}
