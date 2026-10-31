import { existsSync } from "node:fs";
import { resolve } from "node:path";
import express, { type Express, type NextFunction, type Request, type Response } from "express";

/**
 * Serves the built pages from the same address as the API.
 * Missing build output leaves the API running for local development.
 */
export function attachWebClient(app: Express, webRoot: string): void {
  if (!existsSync(webRoot)) {
    return;
  }
  app.use(express.static(webRoot, { index: false }));
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      next();
      return;
    }
    if (request.path.startsWith("/api")) {
      next();
      return;
    }
    response.sendFile(resolve(webRoot, "index.html"));
  });
}
