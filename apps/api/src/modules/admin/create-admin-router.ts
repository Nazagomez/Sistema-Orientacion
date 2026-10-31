import { type RequestHandler, type Response, Router } from "express";
import type { AdminAuthSettings } from "../../config/read-admin-auth.js";
import type { SchedulingSettings } from "../../config/read-scheduling-settings.js";
import { createScheduleToken } from "../citas/schedule-token.js";
import { buildApprovalEmail, buildRejectionEmail } from "../correo/approval-message.js";
import type { DecisionMailer } from "../correo/decision-mailer.js";
import { buildGmailComposeUrl } from "../correo/gmail-compose-url.js";
import { ActiveRequestError } from "../solicitudes/active-request-error.js";
import { buildRequestNotice } from "../solicitudes/build-request-notice.js";
import { createOrientationRequest } from "../solicitudes/create-orientation-request.js";
import type { OrientationRequestRepository } from "../solicitudes/orientation-request-repository.js";
import { parseOrientationRequest } from "../solicitudes/parse-orientation-request.js";
import type { AdminRequestRepository } from "./admin-request-repository.js";
import { passwordsMatch, signAdminToken } from "./admin-session.js";
import { buildApprovedWorkbook } from "./build-approved-workbook.js";
import { decideOrientationRequest } from "./decide-orientation-request.js";

type AdminRouterDependencies = {
  readonly repository: AdminRequestRepository;
  readonly orientationRepository: OrientationRequestRepository;
  readonly settings: SchedulingSettings;
  readonly auth: AdminAuthSettings;
  readonly requireAdmin: RequestHandler;
  readonly mailer: DecisionMailer;
};

const REQUEST_STATES = ["PENDIENTE", "APROBADA", "NO_APROBADA", "CITA_AGENDADA", "FINALIZADA"] as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_SEARCH_LENGTH = 80;
const DEFAULT_PAGE_SIZE = 8;
const MAX_PAGE_SIZE = 50;

/**
 * Exposes counselor login, the request list, decisions, and the approved workbook.
 */
export function createAdminRouter(dependencies: AdminRouterDependencies): Router {
  const { repository, settings, requireAdmin } = dependencies;
  const router = Router();
  router.post("/sesion", (request, response) => {
    respondToSession(dependencies.auth, request.body, response);
  });
  router.use(requireAdmin);
  router.get("/resumen", (_request, response, next) => {
    void repository.summarize().then((summary) => response.json(summary)).catch(next);
  });
  router.get("/solicitudes/exportar", (_request, response, next) => {
    void exportApproved(repository, response).catch(next);
  });
  router.get("/solicitudes", (request, response, next) => {
    void listSolicitudes(repository, request.query, response).catch(next);
  });
  router.post("/solicitudes", (request, response, next) => {
    void createSolicitud(dependencies, request.body, response).catch(next);
  });
  router.get("/solicitudes/:id", (request, response, next) => {
    void findSolicitud(repository, settings, request.params.id, response).catch(next);
  });
  router.patch("/solicitudes/:id", (request, response, next) => {
    void updateSolicitud(repository, request.params.id, request.body, response).catch(next);
  });
  router.delete("/solicitudes/:id", (request, response, next) => {
    void deleteSolicitud(repository, request.params.id, response).catch(next);
  });
  router.post("/solicitudes/:id/restaurar", (request, response, next) => {
    void restoreSolicitud(repository, request.params.id, response).catch(next);
  });
  router.patch("/solicitudes/:id/aprobar", (request, response, next) => {
    void resolveSolicitud(repository, settings, request.params.id, "aprobar", request.body, response).catch(next);
  });
  router.patch("/solicitudes/:id/no-aprobar", (request, response, next) => {
    void resolveSolicitud(repository, settings, request.params.id, "no-aprobar", request.body, response).catch(next);
  });
  return router;
}

function respondToSession(auth: AdminAuthSettings, body: unknown, response: Response): void {
  if (!auth.correo || !auth.password) {
    response.status(503).json({ message: "El acceso del administrador no está configurado." });
    return;
  }
  const credentials = readCredentials(body);
  const isValid = credentials !== null && credentials.correo === auth.correo && passwordsMatch(credentials.contrasena, auth.password);
  if (!credentials || !isValid) {
    response.status(401).json({ message: "Correo o contraseña incorrectos." });
    return;
  }
  response.json({ token: signAdminToken(credentials.correo, auth.jwtSecret) });
}

function readCredentials(body: unknown): { correo: string; contrasena: string } | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const record = body as Record<string, unknown>;
  const correo = typeof record.correo === "string" ? record.correo.trim().toLowerCase() : "";
  const contrasena = typeof record.contrasena === "string" ? record.contrasena : "";
  if (!correo || !contrasena) {
    return null;
  }
  return { correo, contrasena };
}

async function exportApproved(repository: AdminRequestRepository, response: Response): Promise<void> {
  const rows = await repository.listApproved();
  const buffer = await buildApprovedWorkbook(rows);
  response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  response.setHeader("Content-Disposition", 'attachment; filename="solicitudes-aprobadas.xlsx"');
  response.send(buffer);
}

async function createSolicitud(
  dependencies: AdminRouterDependencies,
  body: unknown,
  response: Response,
): Promise<void> {
  const parsed = parseOrientationRequest(body);
  if (!parsed.ok) {
    response.status(400).json({ errors: parsed.errors });
    return;
  }
  try {
    const created = await createOrientationRequest(dependencies.orientationRepository, parsed.value);
    const reviewUrl = `${dependencies.settings.appBaseUrl}/admin/solicitudes/${created.id}`;
    const notice = buildRequestNotice(parsed.value, reviewUrl);
    await dependencies.mailer.notifyNewRequest({ solicitudId: created.id, subject: notice.subject, text: notice.text });
    response.status(201).json({ id: created.id, estado: "PENDIENTE" });
  } catch (error) {
    if (error instanceof ActiveRequestError) {
      response.status(409).json({ message: "Ya existe una solicitud en proceso para este correo." });
      return;
    }
    throw error;
  }
}

async function updateSolicitud(
  repository: AdminRequestRepository,
  id: string | undefined,
  body: unknown,
  response: Response,
): Promise<void> {
  if (!id || !UUID_PATTERN.test(id)) {
    response.status(404).json({ message: "La solicitud no existe." });
    return;
  }
  const parsed = parseOrientationRequest(body);
  if (!parsed.ok) {
    response.status(400).json({ errors: parsed.errors });
    return;
  }
  const result = await repository.update(id, parsed.value);
  if (result === "missing") {
    response.status(404).json({ message: "La solicitud no existe." });
    return;
  }
  if (result === "conflict") {
    response.status(409).json({ message: "Ese correo ya está registrado en otra persona." });
    return;
  }
  response.json({ id });
}

async function deleteSolicitud(
  repository: AdminRequestRepository,
  id: string | undefined,
  response: Response,
): Promise<void> {
  if (!id || !UUID_PATTERN.test(id)) {
    response.status(404).json({ message: "La solicitud no existe." });
    return;
  }
  const removed = await repository.remove(id);
  if (!removed) {
    response.status(404).json({ message: "La solicitud no existe." });
    return;
  }
  response.status(204).end();
}

async function restoreSolicitud(
  repository: AdminRequestRepository,
  id: string | undefined,
  response: Response,
): Promise<void> {
  if (!id || !UUID_PATTERN.test(id)) {
    response.status(404).json({ message: "La solicitud no existe." });
    return;
  }
  const result = await repository.restore(id);
  if (result === "missing") {
    response.status(404).json({ message: "La solicitud no existe." });
    return;
  }
  if (result === "conflict") {
    response.status(409).json({ message: "Esa persona ya tiene otra solicitud en proceso." });
    return;
  }
  response.json({ id });
}

async function listSolicitudes(
  repository: AdminRequestRepository,
  query: { estado?: unknown; q?: unknown; pagina?: unknown; tamano?: unknown; papelera?: unknown },
  response: Response,
): Promise<void> {
  const estado = typeof query.estado === "string" && query.estado.length > 0 ? query.estado : null;
  if (estado !== null && !REQUEST_STATES.some((state) => state === estado)) {
    response.status(400).json({ message: "El estado no es válido." });
    return;
  }
  const rawSearch = typeof query.q === "string" ? query.q.trim() : "";
  const search = rawSearch.length === 0 ? null : rawSearch.slice(0, MAX_SEARCH_LENGTH);
  const page = readPositiveNumber(query.pagina, 1);
  const pageSize = Math.min(readPositiveNumber(query.tamano, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const deleted = query.papelera === "1" || query.papelera === "true";
  const pageResult = await repository.list({ estado, search, page, pageSize, deleted });
  const paginas = pageResult.total === 0 ? 1 : Math.ceil(pageResult.total / pageSize);
  response.json({ solicitudes: pageResult.solicitudes, total: pageResult.total, pagina: page, paginas });
}

function readPositiveNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : fallback;
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

async function findSolicitud(
  repository: AdminRequestRepository,
  settings: SchedulingSettings,
  id: string | undefined,
  response: Response,
): Promise<void> {
  if (!id || !UUID_PATTERN.test(id)) {
    response.status(404).json({ message: "La solicitud no existe." });
    return;
  }
  const solicitud = await repository.findById(id);
  if (!solicitud) {
    response.status(404).json({ message: "La solicitud no existe." });
    return;
  }
  if (solicitud.estado !== "APROBADA" && solicitud.estado !== "NO_APROBADA") {
    response.json(solicitud);
    return;
  }
  const estado = solicitud.estado === "NO_APROBADA" ? "NO_APROBADA" : "APROBADA";
  response.json({ ...solicitud, ...buildDecisionDraft(settings, solicitud, estado) });
}

async function resolveSolicitud(
  repository: AdminRequestRepository,
  settings: SchedulingSettings,
  id: string | undefined,
  decision: "aprobar" | "no-aprobar",
  body: unknown,
  response: Response,
): Promise<void> {
  if (!id || !UUID_PATTERN.test(id)) {
    response.status(404).json({ message: "La solicitud no existe." });
    return;
  }
  const current = await repository.findById(id);
  if (!current) {
    response.status(404).json({ message: "La solicitud no existe." });
    return;
  }
  const observacion = readObservacion(body);
  const result = decideOrientationRequest({ currentEstado: current.estado, decision, observacion });
  if (!result.ok) {
    response.status(result.statusCode).json({ message: result.message });
    return;
  }
  const updated = await repository.applyDecision({ id, estado: result.estado, observacion: result.observacion });
  if (!updated) {
    response.status(409).json({ message: "Solo se puede resolver una solicitud pendiente." });
    return;
  }
  const draft = buildDecisionDraft(settings, { ...current, observacion: result.observacion }, result.estado);
  response.json({ id, estado: result.estado, ...draft });
}

function buildDecisionDraft(
  settings: SchedulingSettings,
  current: { id: string; correo: string; nombre: string; observacion: string | null },
  estado: "APROBADA" | "NO_APROBADA",
): { enlaceAgenda?: string; gmailUrl: string; remitente: string } {
  if (estado === "NO_APROBADA") {
    const message = buildRejectionEmail(current.nombre, current.observacion);
    return {
      remitente: settings.orientadoraCorreo,
      gmailUrl: composeUrl(settings.orientadoraCorreo, current.correo, message.subject, message.text),
    };
  }
  const token = createScheduleToken(current.id, settings.tokenSecret);
  const link = `${settings.appBaseUrl}/agendar?token=${encodeURIComponent(token)}`;
  const message = buildApprovalEmail({ nombre: current.nombre, link });
  return {
    enlaceAgenda: link,
    remitente: settings.orientadoraCorreo,
    gmailUrl: composeUrl(settings.orientadoraCorreo, current.correo, message.subject, message.text),
  };
}

function composeUrl(from: string, to: string, subject: string, body: string): string {
  return buildGmailComposeUrl({ from, to, subject, body });
}

function readObservacion(body: unknown): string {
  if (typeof body !== "object" || body === null || !("observacion" in body)) {
    return "";
  }
  return typeof body.observacion === "string" ? body.observacion : "";
}
