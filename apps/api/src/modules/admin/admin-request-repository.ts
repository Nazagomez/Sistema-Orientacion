import type { OrientationRequest } from "../solicitudes/orientation-request.js";
import type { AdminRequestDetail } from "./admin-request-detail.js";
import type { AdminRequestSummary } from "./admin-request-summary.js";
import type { AdminSummary } from "./admin-summary.js";
import type { ApprovedRequestRow } from "./approved-request-row.js";

export type AdminRequestUpdateResult = "updated" | "missing" | "conflict";

export type AdminRequestRestoreResult = "restored" | "missing" | "conflict";

export type AdminRequestListPage = {
  readonly solicitudes: AdminRequestSummary[];
  readonly total: number;
};

export type AdminRequestRepository = {
  summarize(): Promise<AdminSummary>;
  list(input: {
    readonly estado: string | null;
    readonly search: string | null;
    readonly page: number;
    readonly pageSize: number;
    readonly deleted: boolean;
  }): Promise<AdminRequestListPage>;
  findById(id: string): Promise<AdminRequestDetail | null>;
  applyDecision(input: {
    readonly id: string;
    readonly estado: "APROBADA" | "NO_APROBADA";
    readonly observacion: string | null;
  }): Promise<boolean>;
  update(id: string, request: OrientationRequest): Promise<AdminRequestUpdateResult>;
  remove(id: string): Promise<boolean>;
  restore(id: string): Promise<AdminRequestRestoreResult>;
  listApproved(): Promise<ApprovedRequestRow[]>;
};
