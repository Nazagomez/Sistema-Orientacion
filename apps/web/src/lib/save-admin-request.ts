import type { RequestFormValues } from "./request-form-values";
import { adminFetch } from "./admin-fetch";

export type SaveAdminRequestResult =
  | { readonly kind: "saved"; readonly id: string }
  | { readonly kind: "invalid"; readonly errors: Readonly<Record<string, string>> }
  | { readonly kind: "rejected"; readonly message: string };

type SaveAdminRequestInput = {
  readonly id?: string;
  readonly values: RequestFormValues;
};

/**
 * Creates or updates an orientation request from the counselor panel.
 */
export async function saveAdminRequest(input: SaveAdminRequestInput): Promise<SaveAdminRequestResult> {
  const isNew = input.id === undefined;
  const response = await adminFetch(isNew ? "/api/admin/solicitudes" : `/api/admin/solicitudes/${input.id}`, {
    method: isNew ? "POST" : "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input.values),
  });
  const body: unknown = await response.json();
  if (response.status === 400 && isErrorMap(body)) {
    return { kind: "invalid", errors: body.errors };
  }
  if (!response.ok || !isSaved(body)) {
    return { kind: "rejected", message: readMessage(body) ?? "No se pudo guardar la solicitud." };
  }
  return { kind: "saved", id: body.id };
}

function isSaved(value: unknown): value is { id: string } {
  return typeof value === "object" && value !== null && "id" in value && typeof value.id === "string";
}

function isErrorMap(value: unknown): value is { errors: Record<string, string> } {
  if (typeof value !== "object" || value === null || !("errors" in value)) {
    return false;
  }
  const errors = value.errors;
  if (typeof errors !== "object" || errors === null) {
    return false;
  }
  return Object.values(errors).every((message) => typeof message === "string");
}

function readMessage(value: unknown): string | null {
  if (typeof value === "object" && value !== null && "message" in value && typeof value.message === "string") {
    return value.message;
  }
  return null;
}
