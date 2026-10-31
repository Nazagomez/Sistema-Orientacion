const TOKEN_KEY = "orientacion.admin.token";

/**
 * Reads the counselor session stored for this browser tab.
 */
export function readAdminToken(): string {
  return sessionStorage.getItem(TOKEN_KEY) ?? "";
}

/**
 * Stores the counselor session until the tab is closed.
 */
export function saveAdminToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

/**
 * Drops the counselor session.
 */
export function clearAdminToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}
