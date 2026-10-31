export type AdminAuthSettings = {
  readonly correo: string;
  readonly password: string;
  readonly jwtSecret: string;
};

const MIN_SECRET_LENGTH = 16;

/**
 * Reads the counselor login settings. The JWT secret falls back to the schedule secret in local development.
 */
export function readAdminAuth(source: NodeJS.ProcessEnv): AdminAuthSettings {
  const jwtSecret = (source.JWT_SECRET ?? source.SCHEDULE_TOKEN_SECRET ?? "").trim();
  if (jwtSecret.length < MIN_SECRET_LENGTH) {
    throw new Error("JWT_SECRET must have at least 16 characters.");
  }
  return {
    correo: (source.ADMIN_CORREO ?? source.ORIENTADORA_CORREO ?? "").trim().toLowerCase(),
    password: (source.ADMIN_PASSWORD ?? "").trim(),
    jwtSecret,
  };
}
