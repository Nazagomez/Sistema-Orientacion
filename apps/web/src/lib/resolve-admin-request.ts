import { adminFetch } from "./admin-fetch";

type ResolveAdminRequestInput = {
  readonly id: string;
  readonly decision: "aprobar" | "no-aprobar";
  readonly observacion: string;
};

export type ResolvedAdminRequest = {
  readonly estado: "APROBADA" | "NO_APROBADA";
  readonly gmailUrl: string | null;
};

/**
 * Approves or rejects a pending request and returns the Gmail draft link.
 */
export async function resolveAdminRequest(input: ResolveAdminRequestInput): Promise<ResolvedAdminRequest> {
  const response = await adminFetch(`/api/admin/solicitudes/${input.id}/${input.decision}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ observacion: input.observacion }),
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = readMessage(body);
    throw new Error(message ?? "No se pudo actualizar la solicitud.");
  }
  return {
    estado: input.decision === "aprobar" ? "APROBADA" : "NO_APROBADA",
    gmailUrl: readGmailUrl(body),
  };
}

function readGmailUrl(value: unknown): string | null {
  if (typeof value === "object" && value !== null && "gmailUrl" in value && typeof value.gmailUrl === "string") {
    return value.gmailUrl;
  }
  return null;
}

function readMessage(value: unknown): string | null {
  if (typeof value === "object" && value !== null && "message" in value && typeof value.message === "string") {
    return value.message;
  }
  return null;
}
