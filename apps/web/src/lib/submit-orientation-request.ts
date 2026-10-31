import type { RequestFormValues } from "./request-form-values";

export type SubmitOrientationResult =
  | { readonly kind: "created" }
  | { readonly kind: "invalid"; readonly errors: Readonly<Record<string, string>> }
  | { readonly kind: "conflict"; readonly message: string }
  | { readonly kind: "failure"; readonly message: string };

/**
 * Sends the orientation form to the API.
 */
export async function submitOrientationRequest(values: RequestFormValues): Promise<SubmitOrientationResult> {
  const response = await fetch("/api/solicitudes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const body: unknown = await readJson(response);
  if (response.status === 201) {
    return { kind: "created" };
  }
  if (response.status === 400 && isErrorBody(body)) {
    return { kind: "invalid", errors: body.errors };
  }
  if (response.status === 409 && isMessageBody(body)) {
    return { kind: "conflict", message: body.message };
  }
  return { kind: "failure", message: "No se pudo enviar la solicitud. Intente de nuevo." };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isErrorBody(value: unknown): value is { errors: Record<string, string> } {
  if (typeof value !== "object" || value === null || !("errors" in value)) {
    return false;
  }
  const errors = value.errors;
  return typeof errors === "object" && errors !== null;
}

function isMessageBody(value: unknown): value is { message: string } {
  return typeof value === "object" && value !== null && "message" in value && typeof value.message === "string";
}
