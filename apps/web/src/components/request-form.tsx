import { useState, type FormEvent, type ReactElement } from "react";
import { validateRequestForm } from "../lib/validate-request-form";
import type { RequestFormValues } from "../lib/request-form-values";
import { submitOrientationRequest } from "../lib/submit-orientation-request";
import { TopicFieldset } from "./topic-fieldset";
import { UnderlineField } from "./underline-field";

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

type RequestFormProps = {
  readonly onSubmitted: () => void;
};

/**
 * Student orientation form. Date and status are assigned by the system.
 */
export function RequestForm({ onSubmitted }: RequestFormProps): ReactElement {
  const [values, setValues] = useState<RequestFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const [formMessage, setFormMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createdOn = formatToday();
  function updateValue(key: keyof RequestFormValues, value: string): void {
    setValues((current) => ({ ...current, [key]: value }));
  }
  function toggleTopic(code: string): void {
    setValues((current) => ({
      ...current,
      temas: current.temas.includes(code)
        ? current.temas.filter((topic) => topic !== code)
        : [...current.temas, code],
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
      const result = await submitOrientationRequest(values);
      if (result.kind === "created") {
        onSubmitted();
        return;
      }
      if (result.kind === "invalid") {
        setErrors(result.errors);
        return;
      }
      setFormMessage(result.message);
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "No se pudo enviar la solicitud. Intente de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <form
      className="rounded-3xl bg-white px-5 py-8 shadow-[0_10px_30px_rgb(234_126_163_/_0.12)] sm:px-8 md:px-10 md:py-10"
      noValidate
      onSubmit={(event) => void handleSubmit(event)}
    >
      <h1 className="font-serif text-3xl text-ink md:text-4xl">Solicitud de orientación</h1>
      <p className="mt-2 text-sm text-berry">Universidad Nacional de Costa Rica</p>
      {formMessage ? (
        <p className="mt-6 text-sm text-danger" role="alert">
          {formMessage}
        </p>
      ) : null}
      <div className="mt-8 grid gap-x-10 gap-y-7 md:grid-cols-2">
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
      <div className="mt-8 grid gap-x-10 gap-y-7 md:grid-cols-2">
        <UnderlineField id="fecha" label="Fecha de creación" value={createdOn} readOnly />
        <UnderlineField id="estado" label="Estado" value="Pendiente" readOnly />
      </div>
      <div className="mt-10 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-berry px-8 py-3 text-sm font-medium text-white disabled:opacity-60 sm:w-64"
        >
          {isSubmitting ? "Enviando…" : "Enviar solicitud"}
        </button>
      </div>
    </form>
  );
}

function formatToday(): string {
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "long",
    timeZone: "America/Costa_Rica",
  }).format(new Date());
}
