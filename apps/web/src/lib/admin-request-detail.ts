import type { AdminRequestSummary } from "./admin-request-summary";

export type AdminRequestDetail = AdminRequestSummary & {
  readonly telefono: string;
  readonly otroTema: string | null;
  readonly observacion: string | null;
  readonly temas: readonly string[];
  readonly temaCodigos: readonly string[];
  readonly eliminada: boolean;
  readonly enlaceAgenda?: string;
  readonly gmailUrl?: string;
  readonly remitente?: string;
  readonly historial: readonly {
    readonly estadoAnterior: string | null;
    readonly estadoNuevo: string;
    readonly fecha: string;
  }[];
};
