import type { RequestFormValues } from "./request-form-values";
import { ORIENTATION_TOPICS } from "./orientation-topics";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IDENTIFICATION_PATTERN = /^[a-zA-Z0-9-]+$/;
const TOPIC_CODES: readonly string[] = ORIENTATION_TOPICS.map((topic) => topic.code);

/**
 * Checks the student form before it is sent. The API repeats these rules.
 */
export function validateRequestForm(values: RequestFormValues): Readonly<Record<string, string>> {
  const errors: Record<string, string> = {};
  const nombre = values.nombre.trim();
  const identificacion = values.identificacion.trim();
  const correo = values.correo.trim();
  const digits = values.telefono.replace(/\D/g, "");
  if (nombre.length < 3 || nombre.length > 120) {
    errors.nombre = "Escriba el nombre completo.";
  }
  if (identificacion.length < 5 || identificacion.length > 20 || !IDENTIFICATION_PATTERN.test(identificacion)) {
    errors.identificacion = "Escriba la identificación.";
  }
  if (!EMAIL_PATTERN.test(correo) || correo.length > 248) {
    errors.correo = "Escriba el correo institucional.";
  }
  if (digits.length < 8 || digits.length > 15) {
    errors.telefono = "Escriba un teléfono válido.";
  }
  if (values.carrera.trim().length < 2) {
    errors.carrera = "Escriba la carrera.";
  }
  if (values.nivel.trim().length < 1) {
    errors.nivel = "Escriba el año o nivel.";
  }
  if (values.temas.length === 0 || values.temas.some((topic) => !TOPIC_CODES.includes(topic))) {
    errors.temas = "Seleccione al menos un tema.";
  }
  if (values.temas.includes("otro") && values.otroTema.trim().length === 0) {
    errors.otroTema = "Indique el otro tema.";
  }
  return errors;
}
