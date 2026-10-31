type OrientationDecision = "aprobar" | "no-aprobar";

type DecisionInput = {
  readonly currentEstado: string;
  readonly decision: OrientationDecision;
  readonly observacion: string;
};

type DecisionResult =
  | { readonly ok: true; readonly estado: "APROBADA" | "NO_APROBADA"; readonly observacion: string | null }
  | { readonly ok: false; readonly statusCode: 400 | 409; readonly message: string };

const MIN_OBSERVATION_LENGTH = 3;

/**
 * Resolves whether a pending request can be approved or rejected.
 */
export function decideOrientationRequest(input: DecisionInput): DecisionResult {
  if (input.currentEstado !== "PENDIENTE") {
    return { ok: false, statusCode: 409, message: "Solo se puede resolver una solicitud pendiente." };
  }
  const observacion = input.observacion.trim();
  if (input.decision === "aprobar") {
    return { ok: true, estado: "APROBADA", observacion: observacion.length === 0 ? null : observacion };
  }
  if (observacion.length < MIN_OBSERVATION_LENGTH) {
    return { ok: false, statusCode: 400, message: "Escriba la observación para la estudiante." };
  }
  return { ok: true, estado: "NO_APROBADA", observacion };
}
