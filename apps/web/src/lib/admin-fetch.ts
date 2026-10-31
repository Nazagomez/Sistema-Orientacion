import { clearAdminToken, readAdminToken } from "./admin-session";

/**
 * Calls a counselor route and sends the session back to login when it expired.
 */
export async function adminFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = readAdminToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(url, { ...init, headers });
  if (response.status === 401 && !url.includes("/api/admin/sesion")) {
    clearAdminToken();
    if (window.location.pathname !== "/admin/ingresar") {
      window.location.assign("/admin/ingresar");
    }
  }
  return response;
}
