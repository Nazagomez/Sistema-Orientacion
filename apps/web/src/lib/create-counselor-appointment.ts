import { adminFetch } from "./admin-fetch";

type CreateCounselorAppointmentInput = {
  readonly solicitudId: string;
  readonly fecha: string;
  readonly horaInicio: string;
  readonly comentario: string;
};

/**
 * Schedules an approved request from the counselor calendar.
 */
export async function createCounselorAppointment(input: CreateCounselorAppointmentInput): Promise<void> {
  const response = await adminFetch("/api/citas/agenda", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (response.ok) {
    return;
  }
  const body: unknown = await response.json().catch(() => null);
  throw new Error(readMessage(body) ?? "No se pudo crear la cita.");
}

function readMessage(value: unknown): string | null {
  if (typeof value === "object" && value !== null && "message" in value && typeof value.message === "string") {
    return value.message;
  }
  return null;
}
