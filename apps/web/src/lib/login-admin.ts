import { adminFetch } from "./admin-fetch";

type LoginAdminInput = {
  readonly correo: string;
  readonly contrasena: string;
};

/**
 * Opens a counselor session and returns the JWT.
 */
export async function loginAdmin(input: LoginAdminInput): Promise<string> {
  const response = await adminFetch("/api/admin/sesion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      correo: input.correo.trim().toLowerCase(),
      contrasena: input.contrasena,
    }),
  });
  const body: unknown = await response.json();
  const token = readToken(body);
  if (!response.ok || !token) {
    throw new Error(readMessage(body) ?? "No se pudo iniciar sesión.");
  }
  return token;
}

function readToken(value: unknown): string | null {
  if (typeof value === "object" && value !== null && "token" in value && typeof value.token === "string") {
    return value.token;
  }
  return null;
}

function readMessage(value: unknown): string | null {
  if (typeof value === "object" && value !== null && "message" in value && typeof value.message === "string") {
    return value.message;
  }
  return null;
}
