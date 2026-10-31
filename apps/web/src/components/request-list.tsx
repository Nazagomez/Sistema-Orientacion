import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import type { AdminRequestSummary } from "../lib/admin-request-summary";
import { formatRequestDate } from "../lib/format-request-date";
import { labelForEstado } from "../lib/label-for-estado";

type RequestListProps = {
  readonly requests: readonly AdminRequestSummary[];
  readonly emptyMessage: string;
  readonly onDelete?: (id: string) => void;
  readonly onRestore?: (id: string) => void;
};

/**
 * Scannable list of orientation requests. Each row opens the detail.
 */
export function RequestList({ requests, emptyMessage, onDelete, onRestore }: RequestListProps): ReactElement {
  if (requests.length === 0) {
    return <p className="py-4 text-sm text-ink/70">{emptyMessage}</p>;
  }
  const showActions = onDelete !== undefined || onRestore !== undefined;
  return (
    <ul className="divide-y divide-pink/70">
      {requests.map((request) => (
        <li key={request.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center">
          <Link
            to={`/admin/solicitudes/${request.id}`}
            className="grid min-w-0 flex-1 gap-1 md:grid-cols-[1.4fr_1fr_0.8fr_0.7fr] md:items-center"
          >
            <span>
              <span className="block font-medium">{request.nombre}</span>
              <span className="block text-sm text-ink/60">{request.correo}</span>
            </span>
            <span className="text-sm text-ink/80">{request.carrera}</span>
            <span className="w-fit rounded-full bg-petal px-3 py-1 text-xs font-medium text-ink">
              {labelForEstado(request.estado)}
            </span>
            <span className="text-sm text-ink/60">{formatRequestDate(request.createdAt)}</span>
          </Link>
          {showActions ? (
            <div className="flex shrink-0 gap-1">
              <Link
                to={`/admin/solicitudes/${request.id}?editar=1`}
                aria-label={`Editar ${request.nombre}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-berry hover:bg-petal"
              >
                <PencilIcon />
              </Link>
              {onRestore ? (
                <button type="button" aria-label={`Restaurar ${request.nombre}`} onClick={() => onRestore(request.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-berry hover:bg-petal">
                  <RestoreIcon />
                </button>
              ) : null}
              {onDelete ? (
                <button type="button" aria-label={`Enviar ${request.nombre} a borrados`} onClick={() => onDelete(request.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-danger hover:bg-petal">
                  <TrashIcon />
                </button>
              ) : null}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function PencilIcon(): ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20h4.5L19.2 9.3a1.8 1.8 0 0 0 0-2.6L17.3 4.8a1.8 1.8 0 0 0-2.6 0L4 15.5V20Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13.5 6.2 17.8 10.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function TrashIcon(): ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 7h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7.5 7 8.2 18.2A1.5 1.5 0 0 0 9.7 19.6h4.6a1.5 1.5 0 0 0 1.5-1.4L16.5 7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function RestoreIcon(): ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 8H4V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.8 8.2a8 8 0 1 1-.6 4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
