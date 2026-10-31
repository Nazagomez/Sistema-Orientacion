const SLOT_STARTS = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"] as const;
const SLOT_ENDS: Readonly<Record<string, string>> = {
  "09:00": "10:00",
  "10:00": "11:00",
  "11:00": "12:00",
  "13:00": "14:00",
  "14:00": "15:00",
  "15:00": "16:00",
  "16:00": "17:00",
};
const HORIZON_DAYS = 21;
const LEAD_TIME_MS = 24 * 60 * 60 * 1000;
const COSTA_RICA_OFFSET = "-06:00";

/**
 * Returns the end of a one-hour orientation slot.
 */
export function endOfSlot(horaInicio: string): string | null {
  return SLOT_ENDS[horaInicio] ?? null;
}

export type OpenSlot = {
  readonly fecha: string;
  readonly horaInicio: string;
  readonly horaFin: string;
  readonly dia: string;
  readonly hora: string;
};

/**
 * Lists bookable one-hour slots: weekdays, 9 to 5, no lunch, at least 24 hours ahead.
 */
export function listOpenSlots(now: Date, occupied: readonly string[]): OpenSlot[] {
  const occupiedKeys = new Set(occupied);
  const slots: OpenSlot[] = [];
  const firstDay = costaRicaDate(now);
  for (let dayOffset = 0; dayOffset < HORIZON_DAYS; dayOffset += 1) {
    const fecha = addDays(firstDay, dayOffset);
    if (isWeekend(fecha)) {
      continue;
    }
    for (const horaInicio of SLOT_STARTS) {
      const horaFin = SLOT_ENDS[horaInicio] ?? "";
      const startsAt = new Date(`${fecha}T${horaInicio}:00${COSTA_RICA_OFFSET}`);
      const key = `${fecha}|${horaInicio}`;
      if (startsAt.getTime() < now.getTime() + LEAD_TIME_MS || occupiedKeys.has(key)) {
        continue;
      }
      slots.push({ fecha, horaInicio, horaFin, dia: formatDay(fecha), hora: formatHour(fecha, horaInicio) });
    }
  }
  return slots;
}

function costaRicaDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function addDays(isoDate: string, days: number): string {
  const [year = 0, month = 1, day = 1] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function isWeekend(fecha: string): boolean {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Costa_Rica",
    weekday: "short",
  }).format(new Date(`${fecha}T12:00:00${COSTA_RICA_OFFSET}`));
  return weekday === "Sat" || weekday === "Sun";
}

function formatDay(fecha: string): string {
  const label: string = new Intl.DateTimeFormat("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Costa_Rica",
  }).format(new Date(`${fecha}T12:00:00${COSTA_RICA_OFFSET}`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatHour(fecha: string, hora: string): string {
  return new Intl.DateTimeFormat("es-CR", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Costa_Rica",
  }).format(new Date(`${fecha}T${hora}:00${COSTA_RICA_OFFSET}`));
}
