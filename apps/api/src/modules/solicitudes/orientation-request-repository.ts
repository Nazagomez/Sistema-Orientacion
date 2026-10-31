import type { OrientationRequest } from "./orientation-request.js";

export type OrientationRequestRepository = {
  hasActiveRequest(email: string): Promise<boolean>;
  insert(request: OrientationRequest): Promise<{ id: string }>;
};
