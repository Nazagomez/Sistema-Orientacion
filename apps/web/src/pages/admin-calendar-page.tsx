import { useEffect, useState, type ReactElement } from "react";
import { AdminShell } from "../components/admin-shell";
import { CalendarAppointment } from "../components/calendar-appointment";
import { CalendarCreateForm } from "../components/calendar-create-form";
import { fetchAdminAppointments, type CounselorAppointment } from "../lib/fetch-admin-appointments";

/**
 * Counselor calendar. Appointments can be created, noted, moved, or removed.
 */
export function AdminCalendarPage(): ReactElement {
  const [appointments, setAppointments] = useState<readonly CounselorAppointment[]>([]);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let isActive = true;
    async function loadAppointments(): Promise<void> {
      try {
        const nextAppointments = await fetchAdminAppointments();
        if (isActive) {
          setAppointments(nextAppointments);
          setMessage("");
        }
      } catch {
        if (isActive) {
          setMessage("No se pudo cargar el calendario.");
        }
      }
    }
    void loadAppointments();
    return () => {
      isActive = false;
    };
  }, [revision]);
  function refresh(nextNotice: string): void {
    setNotice(nextNotice);
    setMessage("");
    setRevision((current) => current + 1);
  }
  const days = groupByDate(appointments);
  return (
    <AdminShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="font-serif text-4xl text-ink">Calendario</h1>
        <button type="button" onClick={() => setIsCreating((current) => !current)} className="rounded-2xl bg-berry px-5 py-3 text-sm font-medium text-white">
          {isCreating ? "Cerrar" : "Nueva cita"}
        </button>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-ink/70">
        Cree la cita de una solicitud aprobada, anote el paso en el comentario y reagende si cambia el día o la hora.
      </p>
      {message ? <p className="mt-6 text-sm text-danger">{message}</p> : null}
      {notice ? <p className="mt-6 text-sm text-ink/80">{notice}</p> : null}
      {isCreating ? (
        <CalendarCreateForm
          onCancel={() => setIsCreating(false)}
          onCreated={() => {
            setIsCreating(false);
            refresh("La cita quedó agendada.");
          }}
        />
      ) : null}
      {days.length === 0 && message.length === 0 ? <p className="mt-8 text-sm text-ink/70">No hay citas agendadas.</p> : null}
      <div className="mt-8 flex flex-col gap-4">
        {days.map((day) => (
          <section key={day.fecha} className="rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgb(234_126_163_/_0.12)] md:p-7">
            <h2 className="font-serif text-2xl text-ink">{day.titulo}</h2>
            <ul className="mt-4 divide-y divide-pink/70">
              {day.citas.map((appointment) => (
                <CalendarAppointment key={appointment.id} appointment={appointment} onChanged={refresh} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </AdminShell>
  );
}

function groupByDate(appointments: readonly CounselorAppointment[]): { fecha: string; titulo: string; citas: CounselorAppointment[] }[] {
  const days: { fecha: string; titulo: string; citas: CounselorAppointment[] }[] = [];
  for (const appointment of appointments) {
    const current = days.at(-1);
    if (!current || current.fecha !== appointment.fecha) {
      days.push({ fecha: appointment.fecha, titulo: formatDay(appointment.fecha), citas: [appointment] });
      continue;
    }
    current.citas.push(appointment);
  }
  return days;
}

function formatDay(fecha: string): string {
  const label: string = new Intl.DateTimeFormat("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Costa_Rica",
  }).format(new Date(`${fecha}T12:00:00-06:00`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
