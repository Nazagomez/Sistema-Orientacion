import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { AdminRequestForm } from "../components/admin-request-form";
import { AdminShell } from "../components/admin-shell";
import type { RequestFormValues } from "../lib/request-form-values";
import { saveAdminRequest, type SaveAdminRequestResult } from "../lib/save-admin-request";

const EMPTY_FORM: RequestFormValues = {
  nombre: "",
  identificacion: "",
  correo: "",
  telefono: "",
  carrera: "",
  nivel: "",
  temas: [],
  otroTema: "",
};

/**
 * Counselor form that registers a request on behalf of a student.
 */
export function AdminRequestCreatePage(): ReactElement {
  const navigate = useNavigate();
  async function handleSubmit(values: RequestFormValues): Promise<SaveAdminRequestResult> {
    const result = await saveAdminRequest({ values });
    if (result.kind === "saved") {
      navigate(`/admin/solicitudes/${result.id}`);
    }
    return result;
  }
  return (
    <AdminShell>
      <h1 className="font-serif text-4xl text-ink">Nueva solicitud</h1>
      <section className="mt-6 rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgb(234_126_163_/_0.12)] md:p-8">
        <AdminRequestForm initial={EMPTY_FORM} submitLabel="Crear solicitud" onSubmit={handleSubmit} />
      </section>
    </AdminShell>
  );
}
