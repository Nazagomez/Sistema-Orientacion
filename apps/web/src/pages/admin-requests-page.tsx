import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { AdminShell } from "../components/admin-shell";
import { RequestList } from "../components/request-list";
import type { AdminRequestSummary } from "../lib/admin-request-summary";
import { deleteAdminRequest } from "../lib/delete-admin-request";
import { downloadApprovedRequests } from "../lib/download-approved-requests";
import { fetchAdminRequests } from "../lib/fetch-admin-requests";
import { labelForEstado } from "../lib/label-for-estado";
import { restoreAdminRequest } from "../lib/restore-admin-request";

const FILTERS = ["", "PENDIENTE", "APROBADA", "NO_APROBADA", "CITA_AGENDADA", "FINALIZADA"] as const;

/**
 * Searchable list of every orientation request.
 */
export function AdminRequestsPage(): ReactElement {
  const [estado, setEstado] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [trash, setTrash] = useState(false);
  const [requests, setRequests] = useState<readonly AdminRequestSummary[]>([]);
  const [message, setMessage] = useState("");
  const [exportMessage, setExportMessage] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let isActive = true;
    async function loadRequests(): Promise<void> {
      try {
        const nextPage = await fetchAdminRequests({
          estado: estado || undefined,
          search: search || undefined,
          page,
          deleted: trash,
        });
        if (!isActive) {
          return;
        }
        if (nextPage.solicitudes.length === 0 && page > 1) {
          setPage(page - 1);
          return;
        }
        setRequests(nextPage.solicitudes);
        setPageCount(nextPage.paginas);
        setTotal(nextPage.total);
        setMessage("");
      } catch {
        if (isActive) {
          setMessage("No se pudieron cargar las solicitudes.");
        }
      }
    }
    void loadRequests();
    return () => {
      isActive = false;
    };
  }, [estado, search, page, trash, revision]);
  function applySearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setPage(1);
    setSearch(draftSearch.trim());
  }
  async function moveToTrash(id: string): Promise<void> {
    const confirmed = window.confirm("¿Enviar esta solicitud a la bandeja de borrados?");
    if (!confirmed) {
      return;
    }
    try {
      await deleteAdminRequest(id);
      setRevision((current) => current + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo enviar la solicitud a borrados.");
    }
  }
  async function restore(id: string): Promise<void> {
    try {
      await restoreAdminRequest(id);
      setRevision((current) => current + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo restaurar la solicitud.");
    }
  }
  async function exportApproved(): Promise<void> {
    setIsExporting(true);
    setExportMessage("");
    try {
      await downloadApprovedRequests();
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : "No se pudo exportar el archivo.");
    } finally {
      setIsExporting(false);
    }
  }
  return (
    <AdminShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="font-serif text-4xl text-ink">Solicitudes</h1>
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/solicitudes/nueva" className="rounded-2xl bg-berry px-5 py-3 text-sm font-medium text-white">
            Nueva solicitud
          </Link>
          <button type="button" disabled={isExporting} onClick={() => void exportApproved()} className="rounded-2xl border border-berry px-5 py-3 text-sm font-medium text-berry disabled:opacity-60">
            {isExporting ? "Exportando…" : "Exportar aprobadas"}
          </button>
        </div>
      </div>
      {exportMessage ? <p className="mt-4 text-sm text-danger">{exportMessage}</p> : null}
      {trash ? <p className="mt-4 text-sm text-ink/70">Estas solicitudes están en la bandeja de borrados. Puede restaurarlas.</p> : null}
      <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={applySearch}>
        <input
          value={draftSearch}
          onChange={(event) => setDraftSearch(event.target.value)}
          placeholder="Buscar por nombre, correo o identificación"
          className="w-full rounded-2xl border border-pink bg-white px-4 py-3 text-sm outline-none focus:border-berry"
        />
        <button type="submit" className="rounded-2xl bg-berry px-5 py-3 text-sm font-medium text-white">
          Buscar
        </button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter || "todas"}
            type="button"
            onClick={() => {
              setEstado(filter);
              setPage(1);
            }}
            className={`rounded-full px-4 py-2 text-sm ${estado === filter ? "bg-berry text-white" : "bg-petal text-ink"}`}
          >
            {filter === "" ? "Todas" : labelForEstado(filter)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setTrash((current) => !current);
            setPage(1);
          }}
          className={`rounded-full px-4 py-2 text-sm ${trash ? "bg-berry text-white" : "bg-petal text-ink"}`}
        >
          Bandeja de borrados
        </button>
      </div>
      <section className="mt-6 rounded-3xl bg-white px-5 py-2 shadow-[0_10px_30px_rgb(234_126_163_/_0.12)] md:px-7">
        {message ? <p className="py-4 text-sm text-danger">{message}</p> : null}
        <RequestList
          requests={requests}
          emptyMessage={trash ? "La bandeja de borrados está vacía." : "No hay solicitudes con ese criterio."}
          onDelete={trash ? undefined : (id) => void moveToTrash(id)}
          onRestore={trash ? (id) => void restore(id) : undefined}
        />
        <RequestPager page={page} pageCount={pageCount} total={total} onPage={setPage} />
      </section>
    </AdminShell>
  );
}

function RequestPager({
  page,
  pageCount,
  total,
  onPage,
}: {
  readonly page: number;
  readonly pageCount: number;
  readonly total: number;
  readonly onPage: (page: number) => void;
}): ReactElement | null {
  if (total === 0) {
    return null;
  }
  return (
    <div className="flex items-center justify-between gap-3 border-t border-pink/70 py-4">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-full px-4 py-2 text-sm text-berry disabled:opacity-40">
        Anterior
      </button>
      <p className="text-sm text-ink/70">Página {page} de {pageCount}</p>
      <button type="button" disabled={page >= pageCount} onClick={() => onPage(page + 1)} className="rounded-full px-4 py-2 text-sm text-berry disabled:opacity-40">
        Siguiente
      </button>
    </div>
  );
}
