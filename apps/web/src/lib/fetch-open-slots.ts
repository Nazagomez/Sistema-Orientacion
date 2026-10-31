export type OpenDay = {
  readonly fecha: string;
  readonly dia: string;
  readonly horarios: readonly { readonly horaInicio: string; readonly hora: string }[];
};

export type OpenAgenda = {
  readonly agendada: boolean;
  readonly dias: readonly OpenDay[];
};

/**
 * Loads the free hours for the link sent in the approval email.
 */
export async function fetchOpenSlots(token: string): Promise<OpenAgenda> {
  const response = await fetch(`/api/citas/disponibilidad?token=${encodeURIComponent(token)}`);
  const body: unknown = await response.json();
  if (!response.ok || !isOpenAgenda(body)) {
    throw new Error("El enlace no es válido.");
  }
  return body;
}

function isOpenAgenda(value: unknown): value is OpenAgenda {
  return typeof value === "object" && value !== null && "agendada" in value && "dias" in value && Array.isArray(value.dias);
}
