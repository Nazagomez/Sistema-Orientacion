import { ActiveRequestError } from "./active-request-error.js";
import type { OrientationRequest } from "./orientation-request.js";
import type { OrientationRequestRepository } from "./orientation-request-repository.js";

/**
 * Stores a pending orientation request when the student has none open.
 */
export async function createOrientationRequest(
  repository: OrientationRequestRepository,
  request: OrientationRequest,
): Promise<{ id: string }> {
  const hasActiveRequest = await repository.hasActiveRequest(request.correo);
  if (hasActiveRequest) {
    throw new ActiveRequestError();
  }
  return repository.insert(request);
}
