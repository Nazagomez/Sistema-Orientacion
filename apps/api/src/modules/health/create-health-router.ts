import { Router } from "express";
import type { HealthDatabase } from "../../database/health-database.js";
import { checkHealth } from "./check-health.js";

/**
 * Exposes the process and database health check.
 */
export function createHealthRouter(database: HealthDatabase): Router {
  const router = Router();
  router.get("/", (_request, response, next) => {
    void checkHealth(database)
      .then((report) => {
        const statusCode = report.status === "ok" ? 200 : 503;
        response.status(statusCode).json(report);
      })
      .catch(next);
  });
  return router;
}
