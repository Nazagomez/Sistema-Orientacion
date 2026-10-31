import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { CalendarSlotPicker, type ChosenCalendarSlot } from "./calendar-slot-picker";
import { createCounselorAppointment } from "../lib/create-counselor-appointment";
import { fetchAdminRequests } from "../lib/fetch-admin-requests";
import type { OpenDay } from "../lib/fetch-open-slots";
import { fetchCounselorSlots } from "../lib/fetch-counselor-slots";
import type { AdminRequestSummary } from "../lib/admin-request-summary";

type CalendarCreateFormProps = {
  readonly onCreated: () => void;
  readonly onCancel: () => void;
};

/**
 * Assigns a free hour and a step note to an approved request.
 */
export function CalendarCreateForm({ onCreated, onCancel }: CalendarCreateFormProps): ReactElement {
  const [requests, setRequests] = useState<readonly AdminRequestSummary[]>([]);
  const [days, setDays] = useState<readonly OpenDay[]>([]);
  const [solicitudId, setSolicitudId] = useState("");
  const [slot, setSlot] = useState<ChosenCalendarSlot | null>(null);
  const [comentario, setComentario] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    let isActive = true;
    async function loadForm(): Promise<void> {
      try {
        const [page, nextDays] = await Promise.all([
          fetchAdminRequests({ estado: "APROBADA", pageSize: 50 }),
          fetchCounselorSlots(),
        ]);
        if (!isActive) {
          return;
        }
        setRequests(page.solicitudes);
        setDays(nextDays);
        setSolicitudId(page.solicitudes[0]?.id ?? "");
      } catch {
        if (isActive) {
          setMessage("No se pudo preparar el formulario.");
        }
      }
    }
    void loadForm();
    return () => {
      isActive = false;
    };
  }, []);
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!solicitudId || !slot) {
      setMessage("Elija la solicitud y el horario.");
      return;
    }
    setIsSaving(true);
    setMessage("");
    try {
      await createCounselorAppointment({
        solicitudId,
        fecha: slot.fecha,
        horaInicio: slot.horaInicio,
        comentario,
      });
      onCreated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear la cita.");
    } finally {
      setIsSaving(false);
    }
  }
  return (
    <form className="mt-6 rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgb(234_126_163_/_0.12)] md:p-7" onSubmit={(event) => void handleSubmit(event)}>
      <h2 className="font-serif text-2xl text-ink">Nueva cita</h2>
      <p className="mt-2 text-sm text-ink/70">Elija una solicitud aprobada, el horario y anote el paso que se va a trabajar.</p>
      {message ? <p className="mt-4 text-sm text-danger">{message}</p> : null}
      <label className="mt-5 block text-sm font-semibold" htmlFor="solicitud">
        Solicitud aprobada
      </label>
      <select
        id="solicitud"
        value={solicitudId}
        onChange={(event) => setSolicitudId(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-pink bg-white px-4 py-3 text-sm outline-none focus:border-berry"
      >
        {requests.length === 0 ? <option value="">No hay solicitudes aprobadas</option> : null}
        {requests.map((request) => (
          <option key={request.id} value={request.id}>
            {request.nombre} · {request.correo}
          </option>
        ))}
      </select>
      <div className="mt-5">
        <CalendarSlotPicker
          days={days}
          selectedKey={slot ? `${slot.fecha}|${slot.horaInicio}` : ""}
          onSelect={setSlot}
        />
      </div>
      {slot ? <p className="mt-4 text-sm text-berry">{slot.dia} · {slot.hora}</p> : null}
      <label className="mt-5 block text-sm font-semibold" htmlFor="comentario-nuevo">
        Nota o comentario
      </label>
      <textarea
        id="comentario-nuevo"
        value={comentario}
        maxLength={500}
        onChange={(event) => setComentario(event.target.value)}
        placeholder="Explique el paso de esta cita"
        className="mt-2 min-h-24 w-full rounded-2xl border border-pink bg-blush px-4 py-3 text-sm outline-none focus:border-berry"
      />
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="rounded-2xl border border-berry px-5 py-3 text-sm font-medium text-berry">
          Cancelar
        </button>
        <button type="submit" disabled={isSaving || requests.length === 0} className="rounded-2xl bg-berry px-5 py-3 text-sm font-medium text-white disabled:opacity-60">
          {isSaving ? "Guardando…" : "Crear cita"}
        </button>
      </div>
    </form>
  );
}
