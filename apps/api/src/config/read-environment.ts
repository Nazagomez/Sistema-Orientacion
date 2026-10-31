const DEFAULT_PORT = 3001;
const DEFAULT_CORS_ORIGIN = "http://localhost:5173";
const MIN_PORT = 1;
const MAX_PORT = 65535;

type AppEnvironment = {
  readonly port: number;
  readonly databaseUrl: string;
  readonly corsOrigin: string;
};

/**
 * Reads the API environment and rejects missing or invalid values.
 */
export function readEnvironment(
  source: Readonly<Record<string, string | undefined>>,
): AppEnvironment {
  const databaseUrl = source.DATABASE_URL?.trim() ?? "";
  const port = Number(source.PORT ?? DEFAULT_PORT);
  if (databaseUrl.length === 0) {
    throw new Error("DATABASE_URL is required.");
  }
  if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }
  return {
    port,
    databaseUrl,
    corsOrigin: source.CORS_ORIGIN?.trim() || source.RENDER_EXTERNAL_URL?.trim() || DEFAULT_CORS_ORIGIN,
  };
}
