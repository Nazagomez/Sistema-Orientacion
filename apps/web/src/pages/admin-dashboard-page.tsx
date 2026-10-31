import { useEffect, useState, type ReactElement } from "react";
import { AdminShell } from "../components/admin-shell";
import { RequestList } from "../components/request-list";
import { fetchAdminSummary } from "../lib/fetch-admin-summary";
import { fetchAdminRequests } from "../lib/fetch-admin-requests";
import type { AdminRequestSummary } from "../lib/admin-request-summary";

/**
 * Counselor home: counts and the requests still waiting.
 */
export function AdminDashboardPage(): ReactElement {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof fetchAdminSummary>> | null>(null);
  const [pending, setPending] = useState<readonly AdminRequestSummary[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let isActive = true;
    async function loadDashboard(): Promise<void> {
      try {
        const [nextSummary, nextPending] = await Promise.all([
          fetchAdminSummary(),
          fetchAdminRequests({ estado: "PENDIENTE", pageSize: 20 }),
        ]);
        if (!isActive) {
          return;
        }
        setSummary(nextSummary);
        setPending(nextPending.solicitudes);
      } catch {
        if (isActive) {
          setMessage("No se pudo cargar el panel.");
        }
      }
    }
    void loadDashboard();
    return () => {
      isActive = false;
    };
  }, []);
  return (
    <AdminShell>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-4xl text-ink">Panel de orientación</h1>
        <p className="text-right text-base font-medium text-ink">Nancy Zuñiga</p>
      </div>
      <p className="mt-2 text-sm text-ink/70">Solicitudes del servicio estudiantil</p>
      {message ? <p className="mt-6 text-sm text-danger">{message}</p> : null}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pendientes" value={summary?.pendientes} />
        <StatCard label="Aprobadas" value={summary?.aprobadas} />
        <StatCard label="No aprobadas" value={summary?.noAprobadas} />
        <StatCard label="Citas próximas" value={summary?.citasProximas} />
      </div>
      <section className="mt-8 rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgb(234_126_163_/_0.12)] md:p-7">
        <h2 className="font-serif text-2xl text-ink">Por revisar</h2>
        <div className="mt-2">
          <RequestList requests={pending} emptyMessage="No hay solicitudes pendientes." />
        </div>
      </section>
    </AdminShell>
  );
}

function StatCard({ label, value }: { readonly label: string; readonly value: number | undefined }): ReactElement {
  return (
    <article className="rounded-3xl bg-white px-5 py-5 shadow-[0_10px_30px_rgb(234_126_163_/_0.12)]">
      <p className="text-sm text-ink/60">{label}</p>
      <p className="mt-2 font-serif text-4xl text-berry">{value ?? "–"}</p>
    </article>
  );
}
