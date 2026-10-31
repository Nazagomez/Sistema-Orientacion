import type { AdminRequestSummary } from "./admin-request-summary.js";

export type AdminRequestDetail = AdminRequestSummary & {
  readonly telefono: string;
  readonly otroTema: string | null;
  readonly observacion: string | null;
  readonly temas: readonly string[];
  readonly temaCodigos: readonly string[];
  readonly eliminada: boolean;
  readonly historial: readonly {
    readonly estadoAnterior: string | null;
    readonly estadoNuevo: string;
    readonly fecha: string;
  }[];
};
