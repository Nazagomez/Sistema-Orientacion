import { useEffect, useState, type ReactElement } from "react";
import { useSearchParams } from "react-router-dom";
import { ServiceHeader } from "../components/service-header";
import { bookAppointment } from "../lib/book-appointment";
import { fetchOpenSlots, type OpenDay } from "../lib/fetch-open-slots";

/**
 * Agenda opened from the approval email. After booking, only the confirmation is shown.
 */
export function SchedulePage(): ReactElement {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [isAssigned, setIsAssigned] = useState(false);
  const [days, setDays] = useState<readonly OpenDay[]>([]);
  const [pending, setPending] = useState<ChosenSlot | null>(null);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    let isActive = true;
    async function loadSlots(): Promise<void> {
      try {
        const agenda = await fetchOpenSlots(token);
        if (!isActive) {
          return;
        }
        setIsAssigned(agenda.agendada);
        setDays(agenda.dias);
      } catch {
        if (isActive) {
          setMessage("El enlace no es válido.");
        }
      }
    }
    if (token.length > 0) {
      void loadSlots();
    } else {
      setMessage("El enlace no es válido.");
    }
    return () => {
      isActive = false;
    };
  }, [token]);
  function selectSlot(slot: ChosenSlot): void {
    setMessage("");
    setPending(slot);
  }
  function clearSlot(): void {
    setMessage("");
    setPending(null);
  }
  async function confirmSlot(): Promise<void> {
    if (!pending) {
      return;
    }
    setIsSaving(true);
    setMessage("");
    try {
      await bookAppointment({ token, fecha: pending.fecha, horaInicio: pending.horaInicio });
      setIsAssigned(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ese horario ya no está disponible.");
    } finally {
      setIsSaving(false);
    }
  }
  return (
    <div className="flex min-h-screen flex-col bg-blush text-ink">
      <ServiceHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 md:py-12">
        {isAssigned ? <AssignedMessage /> : null}
        {!isAssigned && pending ? (
          <ConfirmBooking slot={pending} message={message} isSaving={isSaving} onConfirm={() => void confirmSlot()} onBack={clearSlot} />
        ) : null}
        {!isAssigned && !pending ? <SlotPicker days={days} message={message} isSaving={isSaving} onChoose={selectSlot} /> : null}
      </main>
    </div>
  );
}

type ChosenSlot = {
  readonly fecha: string;
  readonly horaInicio: string;
  readonly dia: string;
  readonly hora: string;
};

function AssignedMessage(): ReactElement {
  return (
    <section className="rounded-3xl bg-white px-6 py-16 text-center shadow-[0_10px_30px_rgb(234_126_163_/_0.12)]">
      <h1 className="font-serif text-3xl text-ink md:text-4xl">Su cita ha sido asignada correctamente.</h1>
    </section>
  );
}

function ConfirmBooking({
  slot,
  message,
  isSaving,
  onConfirm,
  onBack,
}: {
  readonly slot: ChosenSlot;
  readonly message: string;
  readonly isSaving: boolean;
  readonly onConfirm: () => void;
  readonly onBack: () => void;
}): ReactElement {
  return (
    <section className="rounded-3xl bg-white px-5 py-8 text-center shadow-[0_10px_30px_rgb(234_126_163_/_0.12)] md:px-10">
      <h1 className="font-serif text-3xl text-ink">Confirme su cita</h1>
      <p className="mt-3 text-sm text-ink/80">¿Está seguro de que desea agendar?</p>
      <p className="mt-6 font-serif text-2xl text-berry">{slot.dia}</p>
      <p className="mt-2 text-lg">{slot.hora}</p>
      {message ? <p className="mt-4 text-sm text-danger">{message}</p> : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button type="button" disabled={isSaving} onClick={onBack} className="rounded-2xl border border-berry px-5 py-3 text-sm font-medium text-berry disabled:opacity-60">
          Elegir otro horario
        </button>
        <button type="button" disabled={isSaving} onClick={onConfirm} className="rounded-2xl bg-berry px-5 py-3 text-sm font-medium text-white disabled:opacity-60">
          {isSaving ? "Agendando…" : "Sí, agendar"}
        </button>
      </div>
    </section>
  );
}

function SlotPicker({
  days,
  message,
  isSaving,
  onChoose,
}: {
  readonly days: readonly OpenDay[];
  readonly message: string;
  readonly isSaving: boolean;
  readonly onChoose: (slot: ChosenSlot) => void;
}): ReactElement {
  return (
    <section className="rounded-3xl bg-white px-5 py-8 shadow-[0_10px_30px_rgb(234_126_163_/_0.12)] md:px-10">
      <h1 className="font-serif text-3xl text-ink">Agende su cita</h1>
      <p className="mt-2 text-sm text-berry">Lunes a viernes, de 9:00 a. m. a 5:00 p. m.</p>
      {message ? <p className="mt-4 text-sm text-danger">{message}</p> : null}
      <div className="mt-8 flex flex-col gap-6">
        {days.map((day) => (
          <div key={day.fecha}>
            <h2 className="text-sm font-semibold">{day.dia}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {day.horarios.map((slot) => (
                <button
                  key={`${day.fecha}-${slot.horaInicio}`}
                  type="button"
                  disabled={isSaving}
                  onClick={() => onChoose({ fecha: day.fecha, horaInicio: slot.horaInicio, dia: day.dia, hora: slot.hora })}
                  className="rounded-full bg-petal px-4 py-2 text-sm text-ink disabled:opacity-60"
                >
                  {slot.hora}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
