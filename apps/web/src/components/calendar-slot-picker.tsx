import type { ReactElement } from "react";
import type { OpenDay } from "../lib/fetch-open-slots";

export type ChosenCalendarSlot = {
  readonly fecha: string;
  readonly horaInicio: string;
  readonly dia: string;
  readonly hora: string;
};

type CalendarSlotPickerProps = {
  readonly days: readonly OpenDay[];
  readonly selectedKey: string;
  readonly onSelect: (slot: ChosenCalendarSlot) => void;
};

/**
 * Weekday hours the counselor can assign or move.
 */
export function CalendarSlotPicker({ days, selectedKey, onSelect }: CalendarSlotPickerProps): ReactElement {
  if (days.length === 0) {
    return <p className="text-sm text-ink/70">No hay horarios libres en las próximas semanas.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {days.map((day) => (
        <div key={day.fecha}>
          <p className="text-sm font-semibold">{day.dia}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {day.horarios.map((slot) => {
              const key = `${day.fecha}|${slot.horaInicio}`;
              const selected = key === selectedKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelect({ fecha: day.fecha, horaInicio: slot.horaInicio, dia: day.dia, hora: slot.hora })}
                  className={`rounded-full px-4 py-2 text-sm ${selected ? "bg-berry text-white" : "bg-petal text-ink"}`}
                >
                  {slot.hora}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
