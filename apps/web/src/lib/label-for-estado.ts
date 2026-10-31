const ESTADO_LABELS: Readonly<Record<string, string>> = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  NO_APROBADA: "No aprobada",
  CITA_AGENDADA: "Cita agendada",
  FINALIZADA: "Finalizada",
};

/**
 * Returns the Spanish label for a request status.
 */
export function labelForEstado(estado: string): string {
  return ESTADO_LABELS[estado] ?? estado;
}
