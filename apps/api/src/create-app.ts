import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import type { Pool } from "pg";
import { readAdminAuth } from "./config/read-admin-auth.js";
import { readSchedulingSettings } from "./config/read-scheduling-settings.js";
import { createErrorHandler } from "./core/create-error-handler.js";
import { createRequireAdmin } from "./core/require-admin.js";
import { createAdminRouter } from "./modules/admin/create-admin-router.js";
import { createPgAdminRequestRepository } from "./modules/admin/pg-admin-request-repository.js";
import { createCitasRouter } from "./modules/citas/create-citas-router.js";
import { createPgAppointmentRepository } from "./modules/citas/pg-appointment-repository.js";
import { createDecisionMailer } from "./modules/correo/decision-mailer.js";
import { createHealthRouter } from "./modules/health/create-health-router.js";
import { createPgOrientationRequestRepository } from "./modules/solicitudes/pg-orientation-request-repository.js";
import { createSolicitudesRouter } from "./modules/solicitudes/create-solicitudes-router.js";

type CreateAppOptions = {
  readonly corsOrigin: string;
  readonly database: Pool;
};

/**
 * Builds the Express application with security middleware and the student routes.
 */
export function createApp(options: CreateAppOptions): Express {
  const app = express();
  const settings = readSchedulingSettings(process.env);
  const repository = createPgOrientationRequestRepository(options.database);
  const adminRepository = createPgAdminRequestRepository(options.database, {
    correo: settings.orientadoraCorreo,
    nombre: settings.orientadoraNombre,
  });
  const appointments = createPgAppointmentRepository(options.database);
  const mailer = createDecisionMailer(options.database, settings);
  const auth = readAdminAuth(process.env);
  const requireAdmin = createRequireAdmin(auth.jwtSecret);
  app.use(helmet());
  app.use(cors({ origin: options.corsOrigin }));
  app.use(express.json({ limit: "100kb" }));
  app.use("/api/health", createHealthRouter(options.database));
  app.use("/api/solicitudes", createSolicitudesRouter(repository, settings, mailer));
  app.use("/api/citas", createCitasRouter(appointments, settings, mailer, requireAdmin));
  app.use("/api/admin", createAdminRouter({
    repository: adminRepository,
    orientationRepository: repository,
    settings,
    auth,
    requireAdmin,
    mailer,
  }));
  app.use(createErrorHandler());
  return app;
}
