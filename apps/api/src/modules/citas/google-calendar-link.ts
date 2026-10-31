const COSTA_RICA_TIME_ZONE = "America/Costa_Rica";

type GoogleCalendarLinkInput = {
  readonly title: string;
  readonly fecha: string;
  readonly horaInicio: string;
  readonly horaFin: string;
  readonly details: string;
};

/**
 * Builds a Google Calendar link that opens the appointment ready to save.
 */
export function buildGoogleCalendarLink(input: GoogleCalendarLinkInput): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${toGoogleStamp(input.fecha, input.horaInicio)}/${toGoogleStamp(input.fecha, input.horaFin)}`,
    details: input.details,
    ctz: COSTA_RICA_TIME_ZONE,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function toGoogleStamp(fecha: string, hora: string): string {
  return `${fecha.replaceAll("-", "")}T${hora.replace(":", "")}00`;
}
