const FORMSUBMIT_URL = "https://formsubmit.co/ajax/";

type FormSubmitMessage = {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly origin?: string;
};

/**
 * Delivers a plain message to an inbox through FormSubmit.
 * Used when the university mailbox rejects program sending.
 */
export async function sendFormSubmitMail(message: FormSubmitMessage, fetchImpl: typeof fetch = fetch): Promise<void> {
  const origin = message.origin ?? "http://localhost:5173";
  const response = await fetchImpl(`${FORMSUBMIT_URL}${encodeURIComponent(message.to)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: origin,
      Referer: `${origin}/`,
    },
    body: JSON.stringify({
      _subject: message.subject,
      _template: "box",
      _captcha: "false",
      message: message.text,
    }),
  });
  const payload: unknown = await readJson(response);
  if (response.ok && isAccepted(payload)) {
    return;
  }
  const detail = readDetail(payload);
  if (detail?.toLowerCase().includes("activation")) {
    throw new Error("Se envió un correo para activar la bandeja de la orientadora. Hay que abrirlo y confirmarlo una vez.");
  }
  throw new Error(detail ?? `No se pudo entregar el correo (${response.status}).`);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isAccepted(value: unknown): boolean {
  if (typeof value !== "object" || value === null || !("success" in value)) {
    return false;
  }
  const success = value.success;
  return success === true || success === "true";
}

function readDetail(value: unknown): string | null {
  if (typeof value === "object" && value !== null && "message" in value && typeof value.message === "string") {
    return value.message;
  }
  return null;
}
