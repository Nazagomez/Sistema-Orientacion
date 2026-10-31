export type SchedulableRequest = {
  readonly id: string;
  readonly estudianteId: string;
  readonly orientadoraId: string;
  readonly estado: string;
  readonly nombre: string;
  readonly correo: string;
};

export type StoredAppointment = {
  readonly id: string;
  readonly solicitudId: string;
  readonly nombre: string;
  readonly correo: string;
  readonly fecha: string;
  readonly horaInicio: string;
  readonly horaFin: string;
  readonly comentario: string;
};

export type ScheduleApprovedResult = "booked" | "unavailable" | "not-approved" | "missing";

export type RescheduleResult = "rescheduled" | "missing" | "unavailable";

export type ClosedAppointment = {
  readonly solicitudId: string;
  readonly solicitudEstado: "FINALIZADA" | "APROBADA";
};

export type AppointmentRepository = {
  findSchedulable(solicitudId: string): Promise<SchedulableRequest | null>;
  listOccupied(orientadoraId: string): Promise<string[]>;
  listScheduleKeys(exceptCitaId: string | null): Promise<string[]>;
  listUpcoming(): Promise<StoredAppointment[]>;
  scheduleApproved(input: {
    readonly solicitudId: string;
    readonly fecha: string;
    readonly horaInicio: string;
    readonly horaFin: string;
    readonly comentario: string | null;
    readonly googleCalendarUrl: string;
  }): Promise<ScheduleApprovedResult>;
  updateComment(id: string, comentario: string | null): Promise<boolean>;
  reschedule(input: {
    readonly id: string;
    readonly fecha: string;
    readonly horaInicio: string;
    readonly horaFin: string;
    readonly googleCalendarUrl: string;
  }): Promise<RescheduleResult>;
  close(input: {
    readonly id: string;
    readonly citaEstado: "COMPLETADA" | "NO_ASISTIO" | "CANCELADA";
    readonly solicitudEstado: "FINALIZADA" | "APROBADA";
  }): Promise<ClosedAppointment | null>;
  book(input: {
    readonly request: SchedulableRequest;
    readonly fecha: string;
    readonly horaInicio: string;
    readonly horaFin: string;
    readonly googleCalendarUrl: string;
  }): Promise<"booked" | "unavailable" | "not-approved">;
};
