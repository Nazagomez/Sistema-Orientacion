import { useEffect, useState, type ReactElement } from "react";
import { CalendarSlotPicker, type ChosenCalendarSlot } from "./calendar-slot-picker";
import { closeAppointment, type AppointmentAction } from "../lib/close-appointment";
import { deleteAppointment } from "../lib/delete-appointment";
import type { OpenDay } from "../lib/fetch-open-slots";
import { fetchCounselorSlots } from "../lib/fetch-counselor-slots";
import type { CounselorAppointment } from "../lib/fetch-admin-appointments";
import { rescheduleAppointment } from "../lib/reschedule-appointment";
import { saveAppointmentNote } from "../lib/save-appointment-note";

type CalendarAppointmentProps = {
  readonly appointment: CounselorAppointment;
  readonly onChanged: (notice: string) => void;
};

/**
 * One scheduled visit, with its note, a new hour, and the close actions.
 */
export function CalendarAppointment({ appointment, onChanged }: CalendarAppointmentProps): ReactElement {
  const [mode, setMode] = useState<"idle" | "note" | "move">("idle");
  const [comentario, setComentario] = useState(appointment.comentario);
  const [days, setDays] = useState<readonly OpenDay[]>([]);
  const [slot, setSlot] = useState<ChosenCalendarSlot | null>(null);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    setComentario(appointment.comentario);
  }, [appointment.comentario]);
  async function saveNote(): Promise<void> {
    setIsSaving(true);
    setMessage("");
    try {
      await saveAppointmentNote(appointment.id, comentario);
      setMode("idle");
      onChanged("El comentario quedó guardado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el comentario.");
    } finally {
      setIsSaving(false);
    }
  }
  async function openMove(): Promise<void> {
    setMode("move");
    setSlot(null);
    setMessage("");
    try {
      setDays(await fetchCounselorSlots(appointment.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron cargar los horarios.");
    }
  }
  async function confirmMove(): Promise<void> {
    if (!slot) {
      setMessage("Elija el nuevo horario.");
      return;
    }
    setIsSaving(true);
    setMessage("");
    try {
      await rescheduleAppointment({ id: appointment.id, fecha: slot.fecha, horaInicio: slot.horaInicio });
      setMode("idle");
      onChanged(`La cita quedó reagendada para ${slot.dia}, ${slot.hora}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo reagendar la cita.");
    } finally {
      setIsSaving(false);
    }
  }
  async function applyAction(action: AppointmentAction): Promise<void> {
    setIsSaving(true);
    setMessage("");
    try {
      await closeAppointment(appointment.id, action);
      onChanged(noticeFor(action));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la cita.");
    } finally {
      setIsSaving(false);
    }
  }
  async function remove(): Promise<void> {
    const confirmed = window.confirm("¿Eliminar esta cita? El horario quedará libre y la solicitud volverá a aprobada.");
    if (!confirmed) {
      return;
    }
    setIsSaving(true);
    setMessage("");
    try {
      await deleteAppointment(appointment.id);
      onChanged("La cita se eliminó. El horario quedó libre.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo eliminar la cita.");
      setIsSaving(false);
    }
  }
  return (
    <li className="py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium">{appointment.nombre}</p>
          <p className="text-sm text-ink/60">{appointment.correo}</p>
          {appointment.comentario ? (
            <p className="mt-2 max-w-xl text-sm whitespace-pre-wrap text-ink/80">{appointment.comentario}</p>
          ) : (
            <p className="mt-2 text-sm text-ink/50">Sin comentario</p>
          )}
        </div>
        <span className="w-fit rounded-full bg-petal px-3 py-1 text-sm">{appointment.horaInicio} – {appointment.horaFin}</span>
      </div>
      {message ? <p className="mt-3 text-sm text-danger">{message}</p> : null}
      {mode === "note" ? (
        <div className="mt-4">
          <label className="block text-sm font-semibold" htmlFor={`nota-${appointment.id}`}>
            Nota o comentario
          </label>
          <textarea
            id={`nota-${appointment.id}`}
            value={comentario}
            maxLength={500}
            onChange={(event) => setComentario(event.target.value)}
            placeholder="Explique el paso de esta cita"
            className="mt-2 min-h-24 w-full rounded-2xl border border-pink bg-blush px-4 py-3 text-sm outline-none focus:border-berry"
          />
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={isSaving} onClick={() => void saveNote()} className="rounded-full bg-berry px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
              Guardar nota
            </button>
            <button type="button" onClick={() => setMode("idle")} className="rounded-full border border-berry px-4 py-2 text-sm text-berry">
              Cerrar
            </button>
          </div>
        </div>
      ) : null}
      {mode === "move" ? (
        <div className="mt-4 rounded-2xl bg-blush px-4 py-4">
          <p className="text-sm font-semibold">¿Reagendar esta cita?</p>
          {slot ? <p className="mt-2 text-sm text-berry">{slot.dia} · {slot.hora}</p> : null}
          <div className="mt-3">
            <CalendarSlotPicker days={days} selectedKey={slot ? `${slot.fecha}|${slot.horaInicio}` : ""} onSelect={setSlot} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={isSaving} onClick={() => void confirmMove()} className="rounded-full bg-berry px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
              {isSaving ? "Guardando…" : "Confirmar reagenda"}
            </button>
            <button type="button" onClick={() => setMode("idle")} className="rounded-full border border-berry px-4 py-2 text-sm text-berry">
              Volver
            </button>
          </div>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={appointment.googleCalendarUrl} target="_blank" rel="noreferrer" className="rounded-full bg-berry px-4 py-2 text-sm font-medium text-white">
          Agregar a Google Calendar
        </a>
        <SmallButton label="Nota" disabled={isSaving} onClick={() => setMode("note")} />
        <SmallButton label="Reagendar" disabled={isSaving} onClick={() => void openMove()} />
        <SmallButton label="Atendida" disabled={isSaving} onClick={() => void applyAction("completar")} />
        <SmallButton label="No asistió" disabled={isSaving} onClick={() => void applyAction("no-asistio")} />
        <SmallButton label="Eliminar" disabled={isSaving} onClick={() => void remove()} />
      </div>
    </li>
  );
}

function SmallButton({ label, disabled, onClick }: { readonly label: string; readonly disabled: boolean; readonly onClick: () => void }): ReactElement {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="rounded-full border border-berry px-4 py-2 text-sm font-medium text-berry disabled:opacity-60">
      {label}
    </button>
  );
}

function noticeFor(action: AppointmentAction): string {
  if (action === "completar") {
    return "La cita quedó atendida y la solicitud finalizada.";
  }
  if (action === "no-asistio") {
    return "La cita quedó como no asistió y la solicitud finalizada.";
  }
  return "La cita se canceló. El horario quedó libre y el estudiante puede agendar de nuevo con el mismo enlace.";
}
