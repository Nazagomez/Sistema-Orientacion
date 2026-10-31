import type { AdminRequestSummary } from "./admin-request-summary";
import { adminFetch } from "./admin-fetch";

export type AdminRequestPage = {
  readonly solicitudes: readonly AdminRequestSummary[];
  readonly total: number;
  readonly pagina: number;
  readonly paginas: number;
};

type FetchAdminRequestsInput = {
  readonly estado?: string;
  readonly search?: string;
  readonly page?: number;
  readonly pageSize?: number;
  readonly deleted?: boolean;
};

/**
 * Loads one page of counselor requests.
 */
export async function fetchAdminRequests(input: FetchAdminRequestsInput = {}): Promise<AdminRequestPage> {
  const params = new URLSearchParams();
  if (input.estado) {
    params.set("estado", input.estado);
  }
  if (input.search) {
    params.set("q", input.search);
  }
  if (input.page) {
    params.set("pagina", String(input.page));
  }
  if (input.pageSize) {
    params.set("tamano", String(input.pageSize));
  }
  if (input.deleted) {
    params.set("papelera", "1");
  }
  const query = params.size > 0 ? `?${params.toString()}` : "";
  const response = await adminFetch(`/api/admin/solicitudes${query}`);
  const body: unknown = await response.json();
  if (!response.ok || !isRequestPage(body)) {
    throw new Error("No se pudieron cargar las solicitudes.");
  }
  return body;
}

function isRequestPage(value: unknown): value is AdminRequestPage {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return Array.isArray(record.solicitudes) && typeof record.total === "number" && typeof record.pagina === "number" && typeof record.paginas === "number";
}
