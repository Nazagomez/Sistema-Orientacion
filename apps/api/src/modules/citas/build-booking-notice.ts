type BookingNoticeInput = {
  readonly nombre: string;
  readonly correo: string;
  readonly fecha: string;
  readonly horaInicio: string;
  readonly horaFin: string;
  readonly calendarUrl: string;
  readonly comentario?: string | null;
};

type BookingNotice = {
  readonly subject: string;
  readonly text: string;
};

/**
 * Text of the notice sent to the counselor when a student books a time.
 */
export function buildBookingNotice(input: BookingNoticeInput): BookingNotice {
  const lines = [
    "Cita agendada.",
    "",
    `Nombre: ${input.nombre}`,
    `Correo: ${input.correo}`,
    `Fecha: ${formatNoticeDate(input.fecha)}`,
    `Hora: ${input.horaInicio}–${input.horaFin}`,
  ];
  if (input.comentario) {
    lines.push(`Nota: ${input.comentario}`);
  }
  lines.push("", "Para guardarla en Google Calendar, abra este enlace:", "", input.calendarUrl);
  return { subject: `Cita agendada · ${input.nombre}`, text: lines.join("\n") };
}

function formatNoticeDate(fecha: string): string {
  const label = new Intl.DateTimeFormat("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Costa_Rica",
  }).format(new Date(`${fecha}T12:00:00-06:00`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
