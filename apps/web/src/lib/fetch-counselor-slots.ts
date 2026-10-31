import type { OpenDay } from "./fetch-open-slots";
import { adminFetch } from "./admin-fetch";

/**
 * Loads the counselor's free hours. A reschedule can keep its current hour.
 */
export async function fetchCounselorSlots(exceptCitaId = ""): Promise<readonly OpenDay[]> {
  const params = new URLSearchParams();
  if (exceptCitaId.length > 0) {
    params.set("excepto", exceptCitaId);
  }
  const query = params.size > 0 ? `?${params.toString()}` : "";
  const response = await adminFetch(`/api/citas/horarios${query}`);
  const body: unknown = await response.json();
  if (!response.ok || !isSlotList(body)) {
    throw new Error("No se pudieron cargar los horarios.");
  }
  return body.dias;
}

function isSlotList(value: unknown): value is { dias: OpenDay[] } {
  return typeof value === "object" && value !== null && "dias" in value && Array.isArray(value.dias);
}
