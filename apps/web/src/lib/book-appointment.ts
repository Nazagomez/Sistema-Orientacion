type BookAppointmentInput = {
  readonly token: string;
  readonly fecha: string;
  readonly horaInicio: string;
};

/**
 * Reserves the chosen hour for the approved request.
 */
export async function bookAppointment(input: BookAppointmentInput): Promise<void> {
  const response = await fetch("/api/citas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error("Ese horario ya no está disponible.");
  }
}
