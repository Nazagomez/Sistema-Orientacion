import { useState, type FormEvent, type ReactElement } from "react";
import { TopicFieldset } from "./topic-fieldset";
import { UnderlineField } from "./underline-field";
import type { RequestFormValues } from "../lib/request-form-values";
import type { SaveAdminRequestResult } from "../lib/save-admin-request";
import { validateRequestForm } from "../lib/validate-request-form";

type AdminRequestFormProps = {
  readonly initial: RequestFormValues;
  readonly submitLabel: string;
  readonly onSubmit: (values: RequestFormValues) => Promise<SaveAdminRequestResult>;
};

/**
 * Counselor form used to create or correct an orientation request.
 */
export function AdminRequestForm({ initial, submitLabel, onSubmit }: AdminRequestFormProps): ReactElement {
  const [values, setValues] = useState<RequestFormValues>(initial);
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const [formMessage, setFormMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  function updateValue(key: keyof RequestFormValues, value: string): void {
    setValues((current) => ({ ...current, [key]: value }));
  }
  function toggleTopic(code: string): void {
    setValues((current) => ({
      ...current,
      temas: current.temas.includes(code) ? current.temas.filter((topic) => topic !== code) : [...current.temas, code],
    }));
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextErrors = validateRequestForm(values);
    setErrors(nextErrors);
    setFormMessage("");
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await onSubmit(values);
      if (result.kind === "invalid") {
        setErrors(result.errors);
        return;
      }
      if (result.kind === "rejected") {
        setFormMessage(result.message);
      }
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "No se pudo guardar la solicitud.");
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <form className="mt-6" noValidate onSubmit={(event) => void handleSubmit(event)}>
      {formMessage ? <p className="mb-4 text-sm text-danger">{formMessage}</p> : null}
      <div className="grid gap-x-10 gap-y-7 md:grid-cols-2">
        <UnderlineField id="nombre" label="Nombre completo" value={values.nombre} error={errors.nombre} autoComplete="name" onChange={(value) => updateValue("nombre", value)} />
        <UnderlineField id="identificacion" label="Identificación" value={values.identificacion} error={errors.identificacion} onChange={(value) => updateValue("identificacion", value)} />
        <UnderlineField id="correo" label="Correo institucional" type="email" value={values.correo} error={errors.correo} autoComplete="email" onChange={(value) => updateValue("correo", value)} />
        <UnderlineField id="telefono" label="Número de teléfono" type="tel" value={values.telefono} error={errors.telefono} autoComplete="tel" onChange={(value) => updateValue("telefono", value)} />
        <UnderlineField id="carrera" label="Carrera que cursa" value={values.carrera} error={errors.carrera} onChange={(value) => updateValue("carrera", value)} />
        <UnderlineField id="nivel" label="Año o nivel que cursa" value={values.nivel} error={errors.nivel} onChange={(value) => updateValue("nivel", value)} />
      </div>
      <div className="mt-8">
        <TopicFieldset selected={values.temas} error={errors.temas} onToggle={toggleTopic} />
      </div>
      {values.temas.includes("otro") ? (
        <div className="mt-7">
          <UnderlineField id="otroTema" label="Otro tema" value={values.otroTema} error={errors.otroTema} onChange={(value) => updateValue("otroTema", value)} />
        </div>
      ) : null}
      <div className="mt-8 flex justify-end">
        <button type="submit" disabled={isSubmitting} className="rounded-2xl bg-berry px-6 py-3 text-sm font-medium text-white disabled:opacity-60">
          {isSubmitting ? "Guardando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
