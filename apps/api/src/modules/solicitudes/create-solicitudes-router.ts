import { type Response, Router } from "express";
import type { SchedulingSettings } from "../../config/read-scheduling-settings.js";
import type { DecisionMailer } from "../correo/decision-mailer.js";
import { ActiveRequestError } from "./active-request-error.js";
import { buildRequestNotice } from "./build-request-notice.js";
import { createOrientationRequest } from "./create-orientation-request.js";
import type { OrientationRequestRepository } from "./orientation-request-repository.js";
import { parseOrientationRequest } from "./parse-orientation-request.js";

/**
 * Accepts a new orientation request from the student form.
 */
export function createSolicitudesRouter(
  repository: OrientationRequestRepository,
  settings: SchedulingSettings,
  mailer: DecisionMailer,
): Router {
  const router = Router();
  router.post("/", (request, response, next) => {
    void respondToCreate(repository, settings, mailer, request.body, response).catch(next);
  });
  return router;
}

async function respondToCreate(
  repository: OrientationRequestRepository,
  settings: SchedulingSettings,
  mailer: DecisionMailer,
  body: unknown,
  response: Response,
): Promise<void> {
  const parsed = parseOrientationRequest(body);
  if (!parsed.ok) {
    response.status(400).json({ errors: parsed.errors });
    return;
  }
  try {
    const created = await createOrientationRequest(repository, parsed.value);
    const reviewUrl = `${settings.appBaseUrl}/admin/solicitudes/${created.id}`;
    const notice = buildRequestNotice(parsed.value, reviewUrl);
    await mailer.notifyNewRequest({ solicitudId: created.id, subject: notice.subject, text: notice.text });
    response.status(201).json({ id: created.id, estado: "PENDIENTE" });
  } catch (error) {
    if (error instanceof ActiveRequestError) {
      response.status(409).json({
        message: "Ya existe una solicitud en proceso para este correo.",
      });
      return;
    }
    throw error;
  }
}
