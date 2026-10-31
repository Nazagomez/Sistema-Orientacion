import { adminFetch } from "./admin-fetch";

export type CounselorAppointment = {
  readonly id: string;
  readonly nombre: string;
  readonly correo: string;
  readonly fecha: string;
  readonly horaInicio: string;
  readonly horaFin: string;
  readonly comentario: string;
  readonly googleCalendarUrl: string;
};

/**
 * Loads upcoming appointments for the counselor calendar.
 */
export async function fetchAdminAppointments(): Promise<CounselorAppointment[]> {
  const response = await adminFetch("/api/citas/agenda");
  const body: unknown = await response.json();
  if (!response.ok || !isAppointmentList(body)) {
    throw new Error("No se pudo cargar el calendario.");
  }
  return body.citas;
}

function isAppointmentList(value: unknown): value is { citas: CounselorAppointment[] } {
  return typeof value === "object" && value !== null && "citas" in value && Array.isArray(value.citas);
}
