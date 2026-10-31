import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Loads the repository root `.env` file into `process.env`.
 */
export function loadEnvironmentFile(): void {
  const sourceDirectory = dirname(fileURLToPath(import.meta.url));
  const environmentPath = resolve(sourceDirectory, "../../../../.env");
  config({ path: environmentPath });
}
