const DEFAULT_APP_BASE_URL = "http://localhost:5173";
const DEFAULT_ORIENTADORA_CORREO = "orientadora@local";
const DEFAULT_ORIENTADORA_NOMBRE = "Orientadora";
const LOCAL_TOKEN_SECRET = "local-dev-schedule-secret";
const MIN_SECRET_LENGTH = 16;

export type SmtpSettings = {
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly password: string;
};

export type SchedulingSettings = {
  readonly appBaseUrl: string;
  readonly tokenSecret: string;
  readonly calendarFeedToken: string;
  readonly orientadoraCorreo: string;
  readonly orientadoraNombre: string;
  readonly smtp: SmtpSettings | null;
};

/**
 * Reads scheduling, mail, and calendar settings.
 * SMTP is optional until the counselor mailbox password is set.
 */
export function readSchedulingSettings(
  source: Readonly<Record<string, string | undefined>>,
): SchedulingSettings {
  const tokenSecret = source.SCHEDULE_TOKEN_SECRET?.trim() || LOCAL_TOKEN_SECRET;
  const calendarFeedToken = source.CALENDAR_FEED_TOKEN?.trim() || LOCAL_TOKEN_SECRET;
  if (tokenSecret.length < MIN_SECRET_LENGTH) {
    throw new Error("SCHEDULE_TOKEN_SECRET must have at least 16 characters.");
  }
  return {
    appBaseUrl: (source.APP_BASE_URL?.trim() || source.RENDER_EXTERNAL_URL?.trim() || DEFAULT_APP_BASE_URL).replace(/\/$/, ""),
    tokenSecret,
    calendarFeedToken,
    orientadoraCorreo: source.ORIENTADORA_CORREO?.trim() || DEFAULT_ORIENTADORA_CORREO,
    orientadoraNombre: source.ORIENTADORA_NOMBRE?.trim() || DEFAULT_ORIENTADORA_NOMBRE,
    smtp: readSmtp(source),
  };
}

function readSmtp(source: Readonly<Record<string, string | undefined>>): SmtpSettings | null {
  const host = source.SMTP_HOST?.trim() ?? "";
  const user = source.SMTP_USER?.trim() ?? "";
  const password = source.SMTP_PASSWORD?.trim() ?? "";
  if (host.length === 0 || user.length === 0 || password.length === 0) {
    return null;
  }
  const port = Number(source.SMTP_PORT ?? "587");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be an integer between 1 and 65535.");
  }
  return { host, port, user, password };
}
