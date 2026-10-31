import type { ErrorRequestHandler } from "express";

/**
 * Returns a JSON error for unexpected failures.
 */
export function createErrorHandler(): ErrorRequestHandler {
  return (error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({ message: "No se pudo completar la solicitud." });
  };
}
