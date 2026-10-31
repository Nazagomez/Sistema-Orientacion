import { useEffect, useState, type ReactElement } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AdminRequestForm } from "../components/admin-request-form";
import { AdminShell } from "../components/admin-shell";
import type { AdminRequestDetail } from "../lib/admin-request-detail";
import { deleteAdminRequest } from "../lib/delete-admin-request";
import { fetchAdminRequest } from "../lib/fetch-admin-request";
import { formatRequestDate } from "../lib/format-request-date";
import { labelForEstado } from "../lib/label-for-estado";
import type { RequestFormValues } from "../lib/request-form-values";
import { resolveAdminRequest } from "../lib/resolve-admin-request";
import { restoreAdminRequest } from "../lib/restore-admin-request";
import { saveAdminRequest, type SaveAdminRequestResult } from "../lib/save-admin-request";

/**
 * Counselor review of one request, with approve and reject actions.
 */
export function AdminRequestDetailPage(): ReactElement {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<AdminRequestDetail | null>(null);
  const [isMissing, setIsMissing] = useState(false);
  const [observacion, setObservacion] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    let isActive = true;
    async function loadRequest(): Promise<void> {
      try {
        const nextRequest = await fetchAdminRequest(id);
        if (!isActive) {
          return;
        }
        setRequest(nextRequest);
        setIsMissing(nextRequest === null);
      } catch {
        if (isActive) {
          setMessage("No se pudo cargar la solicitud.");
        }
      }
    }
    void loadRequest();
    return () => {
      isActive = false;
    };
  }, [id]);
  async function decide(decision: "aprobar" | "no-aprobar"): Promise<void> {
    const draftWindow = window.open("about:blank", "_blank");
    setIsSaving(true);
    setMessage("");
    try {
      const result = await resolveAdminRequest({ id, decision, observacion });
      if (result.gmailUrl && draftWindow) {
        draftWindow.location.href = result.gmailUrl;
      } else {
        draftWindow?.close();
      }
      const nextRequest = await fetchAdminRequest(id);
      setRequest(nextRequest);
      setObservacion("");
    } catch (error) {
      draftWindow?.close();
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la solicitud.");
    } finally {
      setIsSaving(false);
    }
  }
  return (
    <AdminShell>
      <Link to="/admin/solicitudes" className="text-sm text-berry">
        Volver a solicitudes
      </Link>
      {message ? <p className="mt-4 text-sm text-danger">{message}</p> : null}
      {isMissing ? <p className="mt-6 text-sm">La solicitud no existe.</p> : null}
      {request ? (
        <DetailCard
          request={request}
          observacion={observacion}
          isSaving={isSaving}
          onObservacion={setObservacion}
          onDecide={(decision) => void decide(decision)}
          onReload={async () => {
            const nextRequest = await fetchAdminRequest(id);
            setRequest(nextRequest);
          }}
          startEditing={params.get("editar") === "1"}
          onDeleted={() => navigate("/admin/solicitudes")}
        />
      ) : null}
    </AdminShell>
  );
}

type DetailCardProps = {
  readonly request: AdminRequestDetail;
  readonly observacion: string;
  readonly isSaving: boolean;
  readonly onObservacion: (value: string) => void;
  readonly onDecide: (decision: "aprobar" | "no-aprobar") => void;
  readonly onReload: () => Promise<void>;
  readonly onDeleted: () => void;
  readonly startEditing: boolean;
};

function DetailCard({ request, observacion, isSaving, onObservacion, onDecide, onReload, onDeleted, startEditing }: DetailCardProps): ReactElement {
  const [isEditing, setIsEditing] = useState(startEditing);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const canDecide = request.estado === "PENDIENTE";
  async function save(values: RequestFormValues): Promise<SaveAdminRequestResult> {
    const result = await saveAdminRequest({ id: request.id, values });
    if (result.kind === "saved") {
      setIsEditing(false);
      await onReload();
    }
    return result;
  }
  async function restore(): Promise<void> {
    setIsDeleting(true);
    setActionMessage("");
    try {
      await restoreAdminRequest(request.id);
      await onReload();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "No se pudo restaurar la solicitud.");
    } finally {
      setIsDeleting(false);
    }
  }
  async function remove(): Promise<void> {
    const confirmed = window.confirm("¿Enviar esta solicitud a la bandeja de borrados?");
    if (!confirmed) {
      return;
    }
    setIsDeleting(true);
    setActionMessage("");
    try {
      await deleteAdminRequest(request.id);
      onDeleted();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "No se pudo enviar la solicitud a borrados.");
      setIsDeleting(false);
    }
  }
  return (
    <article className="mt-4 rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgb(234_126_163_/_0.12)] md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl text-ink">{request.nombre}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-petal px-4 py-2 text-sm">{labelForEstado(request.estado)}</span>
          <button type="button" onClick={() => setIsEditing((current) => !current)} className="rounded-2xl border border-berry px-4 py-2 text-sm font-medium text-berry">
            {isEditing ? "Cerrar edición" : "Editar"}
          </button>
          {request.eliminada ? (
            <button type="button" disabled={isDeleting} onClick={() => void restore()} className="rounded-2xl border border-berry px-4 py-2 text-sm font-medium text-berry disabled:opacity-60">
              {isDeleting ? "Restaurando…" : "Restaurar"}
            </button>
          ) : (
            <button type="button" disabled={isDeleting} onClick={() => void remove()} className="rounded-2xl border border-danger px-4 py-2 text-sm font-medium text-danger disabled:opacity-60">
              {isDeleting ? "Enviando…" : "Enviar a borrados"}
            </button>
          )}
        </div>
      </div>
      {actionMessage ? <p className="mt-4 text-sm text-danger">{actionMessage}</p> : null}
      {isEditing ? (
        <AdminRequestForm
          key={`${request.id}-${request.correo}`}
          initial={toFormValues(request)}
          submitLabel="Guardar cambios"
          onSubmit={save}
        />
      ) : null}
      {request.gmailUrl ? (
        <div className="mt-4 rounded-2xl bg-blush px-4 py-4">
          <p className="text-sm leading-relaxed text-ink/80">
            El mensaje para {request.correo} está listo en Gmail. Pulse Enviar para que agende su cita.
          </p>
          <a
            href={request.gmailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex rounded-2xl bg-berry px-5 py-3 text-sm font-medium text-white"
          >
            Abrir Gmail
          </a>
        </div>
      ) : null}
      <dl className="mt-6 grid gap-5 md:grid-cols-2">
        <Field label="Correo" value={request.correo} />
        <Field label="Identificación" value={request.identificacion} />
        <Field label="Teléfono" value={request.telefono} />
        <Field label="Carrera" value={request.carrera} />
        <Field label="Año o nivel" value={request.nivel} />
        <Field label="Fecha" value={formatRequestDate(request.createdAt)} />
      </dl>
      <div className="mt-6">
        <p className="text-sm font-semibold">Temas</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {request.temas.map((topic) => (
            <li key={topic} className="rounded-full bg-blush px-3 py-1 text-sm">{topic}</li>
          ))}
        </ul>
        {request.otroTema ? <p className="mt-3 text-sm">Otro: {request.otroTema}</p> : null}
      </div>
      {request.observacion ? (
        <p className="mt-6 text-sm leading-relaxed">Observación: {request.observacion}</p>
      ) : null}
      {canDecide && !request.eliminada ? (
        <div className="mt-8">
          <label className="block text-sm font-semibold" htmlFor="observacion">
            Observación
          </label>
          <textarea
            id="observacion"
            value={observacion}
            onChange={(event) => onObservacion(event.target.value)}
            className="mt-2 min-h-28 w-full rounded-2xl border border-pink bg-blush px-4 py-3 text-sm outline-none focus:border-berry"
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button type="button" disabled={isSaving} onClick={() => onDecide("no-aprobar")} className="rounded-2xl border border-berry px-5 py-3 text-sm font-medium text-berry disabled:opacity-60">
              No aprobar
            </button>
            <button type="button" disabled={isSaving} onClick={() => onDecide("aprobar")} className="rounded-2xl bg-berry px-5 py-3 text-sm font-medium text-white disabled:opacity-60">
              Aprobar
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function toFormValues(request: AdminRequestDetail): RequestFormValues {
  return {
    nombre: request.nombre,
    identificacion: request.identificacion,
    correo: request.correo,
    telefono: request.telefono,
    carrera: request.carrera,
    nivel: request.nivel,
    temas: request.temaCodigos,
    otroTema: request.otroTema ?? "",
  };
}

function Field({ label, value }: { readonly label: string; readonly value: string }): ReactElement {
  return (
    <div className="border-b border-rose/80 pb-2">
      <dt className="text-sm font-semibold">{label}</dt>
      <dd className="mt-1 text-sm text-ink/80">{value}</dd>
    </div>
  );
}
