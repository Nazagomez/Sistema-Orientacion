import type { RequestHandler } from "express";
import { readAdminSubject } from "../modules/admin/admin-session.js";

/**
 * Requires a valid counselor JWT in the Authorization header.
 */
export function createRequireAdmin(secret: string): RequestHandler {
  return (request, response, next) => {
    const header = request.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
    if (!token || !readAdminSubject(token, secret)) {
      response.status(401).json({ message: "No autorizado." });
      return;
    }
    next();
  };
}
