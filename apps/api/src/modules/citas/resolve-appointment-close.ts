export type AppointmentClosePlan = {
  readonly citaEstado: "COMPLETADA" | "NO_ASISTIO" | "CANCELADA";
  readonly solicitudEstado: "FINALIZADA" | "APROBADA";
};

/**
 * Maps a counselor action to the appointment and request states.
 */
export function resolveAppointmentClose(action: string): AppointmentClosePlan | null {
  if (action === "completar") {
    return { citaEstado: "COMPLETADA", solicitudEstado: "FINALIZADA" };
  }
  if (action === "no-asistio") {
    return { citaEstado: "NO_ASISTIO", solicitudEstado: "FINALIZADA" };
  }
  if (action === "cancelar") {
    return { citaEstado: "CANCELADA", solicitudEstado: "APROBADA" };
  }
  return null;
}
