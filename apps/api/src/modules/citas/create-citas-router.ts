import { type RequestHandler, type Response, Router } from "express";
import type { SchedulingSettings } from "../../config/read-scheduling-settings.js";
import type { DecisionMailer } from "../correo/decision-mailer.js";
import type { AppointmentRepository } from "./appointment-repository.js";
import { buildBookingNotice } from "./build-booking-notice.js";
import { buildGoogleCalendarLink } from "./google-calendar-link.js";
import { endOfSlot, listOpenSlots } from "./list-open-slots.js";
import { resolveAppointmentClose } from "./resolve-appointment-close.js";
import { readScheduleToken } from "./schedule-token.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TIME_PATTERN = /^(?:09|10|11|13|14|15|16):00$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_COMMENT_LENGTH = 500;

/**
 * Public agenda used from the approval email, plus the counselor calendar feed.
 */
export function createCitasRouter(
  repository: AppointmentRepository,
  settings: SchedulingSettings,
  mailer: DecisionMailer,
  requireAdmin: RequestHandler,
): Router {
  const router = Router();
  router.get("/disponibilidad", (request, response, next) => {
    void sendAvailability(repository, settings, readToken(request.query.token), response).catch(next);
  });
  router.post("/", (request, response, next) => {
    void bookFromBody(repository, settings, mailer, request.body, response).catch(next);
  });
  router.get("/calendario.ics", (request, response, next) => {
    void sendFeed(repository, settings, readToken(request.query.token), response).catch(next);
  });
  router.get("/horarios", requireAdmin, (request, response, next) => {
    void sendCounselorSlots(repository, readExcept(request.query.excepto), response).catch(next);
  });
  router.post("/agenda", requireAdmin, (request, response, next) => {
    void createFromCounselor(repository, mailer, request.body, response).catch(next);
  });
  router.get("/agenda", requireAdmin, (_request, response, next) => {
    void sendAgenda(repository, response).catch(next);
  });
  router.patch("/:id/nota", requireAdmin, (request, response, next) => {
    void saveNote(repository, request.params.id, request.body, response).catch(next);
  });
  router.patch("/:id/reagendar", requireAdmin, (request, response, next) => {
    void rescheduleFromBody(repository, request.params.id, request.body, response).catch(next);
  });
  router.delete("/:id", requireAdmin, (request, response, next) => {
    void deleteFromCounselor(repository, request.params.id, response).catch(next);
  });
  router.patch("/:id", requireAdmin, (request, response, next) => {
    void closeFromBody(repository, request.params.id, request.body, response).catch(next);
  });
  return router;
}

async function sendAvailability(
  repository: AppointmentRepository,
  settings: SchedulingSettings,
  token: string,
  response: Response,
): Promise<void> {
  const solicitudId = readScheduleToken(token, settings.tokenSecret);
  if (!solicitudId) {
    response.status(401).json({ message: "El enlace no es válido." });
    return;
  }
  const request = await repository.findSchedulable(solicitudId);
  if (!request) {
    response.status(404).json({ message: "La solicitud no está disponible para agendar." });
    return;
  }
  if (request.estado === "CITA_AGENDADA") {
    response.json({ agendada: true, dias: [] });
    return;
  }
  if (request.estado !== "APROBADA") {
    response.status(409).json({ message: "La solicitud no está aprobada." });
    return;
  }
  const occupied = await repository.listOccupied(request.orientadoraId);
  const slots = listOpenSlots(new Date(), occupied);
  response.json({ agendada: false, dias: groupSlots(slots) });
}

async function bookFromBody(
  repository: AppointmentRepository,
  settings: SchedulingSettings,
  mailer: DecisionMailer,
  body: unknown,
  response: Response,
): Promise<void> {
  const parsed = readBooking(body);
  if (!parsed) {
    response.status(400).json({ message: "Elija un horario válido." });
    return;
  }
  const solicitudId = readScheduleToken(parsed.token, settings.tokenSecret);
  if (!solicitudId) {
    response.status(401).json({ message: "El enlace no es válido." });
    return;
  }
  const request = await repository.findSchedulable(solicitudId);
  if (!request || request.estado !== "APROBADA") {
    response.status(409).json({ message: "La solicitud no está disponible para agendar." });
    return;
  }
  const occupied = await repository.listOccupied(request.orientadoraId);
  const slot = listOpenSlots(new Date(), occupied).find(
    (item) => item.fecha === parsed.fecha && item.horaInicio === parsed.horaInicio,
  );
  if (!slot) {
    response.status(409).json({ message: "Ese horario ya no está disponible." });
    return;
  }
  const googleCalendarUrl = buildGoogleCalendarLink({
    title: `Cita de orientación · ${request.nombre}`,
    fecha: slot.fecha,
    horaInicio: slot.horaInicio,
    horaFin: slot.horaFin,
    details: `Cita de orientación con ${request.nombre} (${request.correo}).`,
  });
  const result = await repository.book({
    request,
    fecha: slot.fecha,
    horaInicio: slot.horaInicio,
    horaFin: slot.horaFin,
    googleCalendarUrl,
  });
  if (result !== "booked") {
    response.status(409).json({ message: "Ese horario ya no está disponible." });
    return;
  }
  const notice = buildBookingNotice({
    nombre: request.nombre,
    correo: request.correo,
    fecha: slot.fecha,
    horaInicio: slot.horaInicio,
    horaFin: slot.horaFin,
    calendarUrl: googleCalendarUrl,
  });
  await mailer.notifyCounselor({ solicitudId: request.id, subject: notice.subject, text: notice.text });
  response.status(201).json({ mensaje: "Su cita ha sido asignada correctamente." });
}

async function closeFromBody(
  repository: AppointmentRepository,
  id: string | undefined,
  body: unknown,
  response: Response,
): Promise<void> {
  if (!id || !UUID_PATTERN.test(id)) {
    response.status(404).json({ message: "La cita no existe." });
    return;
  }
  const action = readAction(body);
  const plan = action ? resolveAppointmentClose(action) : null;
  if (!plan) {
    response.status(400).json({ message: "La acción no es válida." });
    return;
  }
  const closed = await repository.close({ id, ...plan });
  if (!closed) {
    response.status(409).json({ message: "Esa cita ya no se puede cambiar." });
    return;
  }
  response.json({ id, solicitudEstado: closed.solicitudEstado, citaEstado: plan.citaEstado });
}

function readAction(body: unknown): string {
  if (typeof body !== "object" || body === null || !("accion" in body)) {
    return "";
  }
  return typeof body.accion === "string" ? body.accion : "";
}

async function sendCounselorSlots(repository: AppointmentRepository, exceptCitaId: string | null, response: Response): Promise<void> {
  const occupied = await repository.listScheduleKeys(exceptCitaId);
  response.json({ dias: groupSlots(listOpenSlots(new Date(), occupied)) });
}

async function createFromCounselor(
  repository: AppointmentRepository,
  mailer: DecisionMailer,
  body: unknown,
  response: Response,
): Promise<void> {
  const parsed = readCounselorBooking(body);
  if (!parsed) {
    response.status(400).json({ message: "Elija una solicitud y un horario válido." });
    return;
  }
  const horaFin = endOfSlot(parsed.horaInicio);
  if (!horaFin || !UUID_PATTERN.test(parsed.solicitudId)) {
    response.status(400).json({ message: "Elija una solicitud y un horario válido." });
    return;
  }
  const request = await repository.findSchedulable(parsed.solicitudId);
  if (!request || request.estado !== "APROBADA") {
    response.status(409).json({ message: "La solicitud no está aprobada." });
    return;
  }
  const slot = await findOpenSlot(repository, null, parsed.fecha, parsed.horaInicio);
  if (!slot) {
    response.status(409).json({ message: "Ese horario ya no está disponible." });
    return;
  }
  const googleCalendarUrl = calendarLink(request.nombre, request.correo, slot.fecha, slot.horaInicio, horaFin, parsed.comentario);
  const result = await repository.scheduleApproved({
    solicitudId: parsed.solicitudId,
    fecha: slot.fecha,
    horaInicio: slot.horaInicio,
    horaFin,
    comentario: parsed.comentario,
    googleCalendarUrl,
  });
  if (result === "missing") {
    response.status(404).json({ message: "La solicitud no existe." });
    return;
  }
  if (result !== "booked") {
    response.status(409).json({ message: "Ese horario ya no está disponible." });
    return;
  }
  const notice = buildBookingNotice({
    nombre: request.nombre,
    correo: request.correo,
    fecha: slot.fecha,
    horaInicio: slot.horaInicio,
    horaFin,
    calendarUrl: googleCalendarUrl,
    comentario: parsed.comentario,
  });
  await mailer.notifyCounselor({ solicitudId: parsed.solicitudId, subject: notice.subject, text: notice.text });
  response.status(201).json({ solicitudId: parsed.solicitudId });
}

async function saveNote(
  repository: AppointmentRepository,
  id: string | undefined,
  body: unknown,
  response: Response,
): Promise<void> {
  if (!id || !UUID_PATTERN.test(id)) {
    response.status(404).json({ message: "La cita no existe." });
    return;
  }
  const comentario = readComment(body);
  if (comentario === "invalid") {
    response.status(400).json({ message: "El comentario puede tener hasta 500 caracteres." });
    return;
  }
  const saved = await repository.updateComment(id, comentario);
  if (!saved) {
    response.status(409).json({ message: "Esa cita ya no se puede cambiar." });
    return;
  }
  response.json({ id });
}

async function rescheduleFromBody(
  repository: AppointmentRepository,
  id: string | undefined,
  body: unknown,
  response: Response,
): Promise<void> {
  if (!id || !UUID_PATTERN.test(id)) {
    response.status(404).json({ message: "La cita no existe." });
    return;
  }
  const parsed = readSlot(body);
  const horaFin = parsed ? endOfSlot(parsed.horaInicio) : null;
  if (!parsed || !horaFin) {
    response.status(400).json({ message: "Elija un horario válido." });
    return;
  }
  const slot = await findOpenSlot(repository, id, parsed.fecha, parsed.horaInicio);
  if (!slot) {
    response.status(409).json({ message: "Ese horario ya no está disponible." });
    return;
  }
  const current = (await repository.listUpcoming()).find((appointment) => appointment.id === id);
  if (!current) {
    response.status(404).json({ message: "La cita no existe." });
    return;
  }
  const result = await repository.reschedule({
    id,
    fecha: slot.fecha,
    horaInicio: slot.horaInicio,
    horaFin,
    googleCalendarUrl: calendarLink(current.nombre, current.correo, slot.fecha, slot.horaInicio, horaFin, current.comentario),
  });
  if (result === "missing") {
    response.status(404).json({ message: "La cita no existe." });
    return;
  }
  if (result !== "rescheduled") {
    response.status(409).json({ message: "Ese horario ya no está disponible." });
    return;
  }
  response.json({ id, fecha: slot.fecha, horaInicio: slot.horaInicio });
}

async function deleteFromCounselor(repository: AppointmentRepository, id: string | undefined, response: Response): Promise<void> {
  if (!id || !UUID_PATTERN.test(id)) {
    response.status(404).json({ message: "La cita no existe." });
    return;
  }
  const closed = await repository.close({ id, citaEstado: "CANCELADA", solicitudEstado: "APROBADA" });
  if (!closed) {
    response.status(409).json({ message: "Esa cita ya no se puede cambiar." });
    return;
  }
  response.status(204).end();
}

async function findOpenSlot(
  repository: AppointmentRepository,
  exceptCitaId: string | null,
  fecha: string,
  horaInicio: string,
): Promise<{ fecha: string; horaInicio: string } | null> {
  const occupied = await repository.listScheduleKeys(exceptCitaId);
  const slot = listOpenSlots(new Date(), occupied).find((item) => item.fecha === fecha && item.horaInicio === horaInicio);
  return slot ? { fecha: slot.fecha, horaInicio: slot.horaInicio } : null;
}

function calendarLink(nombre: string, correo: string, fecha: string, horaInicio: string, horaFin: string, comentario: string | null): string {
  const details = [`Cita de orientación con ${nombre} (${correo}).`, comentario ?? ""].filter((line) => line.length > 0).join("\n");
  return buildGoogleCalendarLink({
    title: `Cita de orientación · ${nombre}`,
    fecha,
    horaInicio,
    horaFin,
    details,
  });
}

async function sendAgenda(repository: AppointmentRepository, response: Response): Promise<void> {
  const appointments = await repository.listUpcoming();
  response.json({
    citas: appointments.map((appointment) => ({
      id: appointment.id,
      nombre: appointment.nombre,
      correo: appointment.correo,
      fecha: appointment.fecha,
      horaInicio: appointment.horaInicio,
      horaFin: appointment.horaFin,
      comentario: appointment.comentario,
      googleCalendarUrl: calendarLink(
        appointment.nombre,
        appointment.correo,
        appointment.fecha,
        appointment.horaInicio,
        appointment.horaFin,
        appointment.comentario,
      ),
    })),
  });
}

async function sendFeed(
  repository: AppointmentRepository,
  settings: SchedulingSettings,
  token: string,
  response: Response,
): Promise<void> {
  if (token.length === 0 || token !== settings.calendarFeedToken) {
    response.status(401).json({ message: "No autorizado." });
    return;
  }
  const appointments = await repository.listUpcoming();
  response.type("text/calendar").send(buildFeed(appointments));
}

function readToken(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readExcept(value: unknown): string | null {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

function readCounselorBooking(body: unknown): { solicitudId: string; fecha: string; horaInicio: string; comentario: string | null } | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const record = body as Record<string, unknown>;
  const slot = readSlot(record);
  const solicitudId = typeof record.solicitudId === "string" ? record.solicitudId : "";
  const comentario = readComment(record);
  if (!slot || comentario === "invalid" || solicitudId.length === 0) {
    return null;
  }
  return { solicitudId, fecha: slot.fecha, horaInicio: slot.horaInicio, comentario };
}

function readSlot(body: unknown): { fecha: string; horaInicio: string } | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const record = body as Record<string, unknown>;
  if (typeof record.fecha !== "string" || typeof record.horaInicio !== "string") {
    return null;
  }
  if (!DATE_PATTERN.test(record.fecha) || !TIME_PATTERN.test(record.horaInicio)) {
    return null;
  }
  return { fecha: record.fecha, horaInicio: record.horaInicio };
}

function readComment(body: unknown): string | null | "invalid" {
  if (typeof body !== "object" || body === null || !("comentario" in body)) {
    return null;
  }
  if (typeof body.comentario !== "string") {
    return "invalid";
  }
  const comentario = body.comentario.trim();
  if (comentario.length > MAX_COMMENT_LENGTH) {
    return "invalid";
  }
  return comentario.length === 0 ? null : comentario;
}

function readBooking(body: unknown): { token: string; fecha: string; horaInicio: string } | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const record = body as Record<string, unknown>;
  if (typeof record.token !== "string" || typeof record.fecha !== "string" || typeof record.horaInicio !== "string") {
    return null;
  }
  if (!DATE_PATTERN.test(record.fecha) || !TIME_PATTERN.test(record.horaInicio)) {
    return null;
  }
  return { token: record.token, fecha: record.fecha, horaInicio: record.horaInicio };
}

function groupSlots(slots: ReturnType<typeof listOpenSlots>): { fecha: string; dia: string; horarios: { horaInicio: string; hora: string }[] }[] {
  const days: { fecha: string; dia: string; horarios: { horaInicio: string; hora: string }[] }[] = [];
  for (const slot of slots) {
    const current = days.at(-1);
    if (!current || current.fecha !== slot.fecha) {
      days.push({ fecha: slot.fecha, dia: slot.dia, horarios: [{ horaInicio: slot.horaInicio, hora: slot.hora }] });
      continue;
    }
    current.horarios.push({ horaInicio: slot.horaInicio, hora: slot.hora });
  }
  return days;
}

function buildFeed(appointments: { fecha: string; horaInicio: string; horaFin: string; nombre: string; correo: string; comentario: string }[]): string {
  const events = appointments.map((appointment) => {
    const stamp = toIcsStamp(appointment.fecha, appointment.horaInicio);
    const end = toIcsStamp(appointment.fecha, appointment.horaFin);
    return [
      "BEGIN:VEVENT",
      `DTSTART;TZID=America/Costa_Rica:${stamp}`,
      `DTEND;TZID=America/Costa_Rica:${end}`,
      `SUMMARY:Cita de orientación · ${escapeIcs(appointment.nombre)}`,
      `DESCRIPTION:${escapeIcs([appointment.correo, appointment.comentario].filter((line) => line.length > 0).join("\n"))}`,
      "END:VEVENT",
    ].join("\r\n");
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//UNA Orientacion//ES", "X-WR-CALNAME:Orientacion estudiantil", ...events, "END:VCALENDAR"].join("\r\n");
}

function toIcsStamp(fecha: string, hora: string): string {
  return `${fecha.replaceAll("-", "")}T${hora.replace(":", "")}00`;
}

function escapeIcs(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
}
