import { adminFetch } from "./admin-fetch";

type RescheduleAppointmentInput = {
  readonly id: string;
  readonly fecha: string;
  readonly horaInicio: string;
};

/**
 * Moves a scheduled appointment to another open hour.
 */
export async function rescheduleAppointment(input: RescheduleAppointmentInput): Promise<void> {
  const response = await adminFetch(`/api/citas/${input.id}/reagendar`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fecha: input.fecha, horaInicio: input.horaInicio }),
  });
  if (response.ok) {
    return;
  }
  const body: unknown = await response.json().catch(() => null);
  const message = typeof body === "object" && body !== null && "message" in body && typeof body.message === "string" ? body.message : null;
  throw new Error(message ?? "No se pudo reagendar la cita.");
}
