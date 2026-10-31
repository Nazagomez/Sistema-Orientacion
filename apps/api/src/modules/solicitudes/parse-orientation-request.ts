import type { OrientationRequest } from "./orientation-request.js";

const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 120;
const IDENTIFICATION_MIN_LENGTH = 5;
const IDENTIFICATION_MAX_LENGTH = 20;
const PHONE_MIN_DIGITS = 8;
const PHONE_MAX_DIGITS = 15;
const MAJOR_MAX_LENGTH = 120;
const LEVEL_MAX_LENGTH = 40;
const OTHER_TOPIC_MAX_LENGTH = 160;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IDENTIFICATION_PATTERN = /^[a-zA-Z0-9-]+$/;
const TOPIC_CODES = [
  "asesoria-vocacional",
  "adaptacion-universitaria",
  "relaciones-interpersonales",
  "organizacion-tiempo",
  "gestion-emociones",
  "resolucion-conflictos",
  "rendimiento-academico",
  "otro",
] as const;

type ParseOrientationRequestResult =
  | { readonly ok: true; readonly value: OrientationRequest }
  | { readonly ok: false; readonly errors: Readonly<Record<string, string>> };

/**
 * Validates the student form body and returns a normalized request.
 */
export function parseOrientationRequest(body: unknown): ParseOrientationRequestResult {
  if (!isRecord(body)) {
    return { ok: false, errors: { formulario: "Los datos enviados no son válidos." } };
  }
  const errors: Record<string, string> = {};
  const nombre = readText(body, "nombre");
  const identificacion = readText(body, "identificacion");
  const correo = readText(body, "correo").toLowerCase();
  const telefono = readText(body, "telefono");
  const carrera = readText(body, "carrera");
  const nivel = readText(body, "nivel");
  const otroTema = readText(body, "otroTema");
  const temas = uniqueTopics(readTopics(body.temas));
  assignLengthError(errors, "nombre", nombre, NAME_MIN_LENGTH, NAME_MAX_LENGTH, "Escriba el nombre completo.");
  assignIdentificationError(errors, identificacion);
  assignEmailError(errors, correo);
  assignPhoneError(errors, telefono);
  assignLengthError(errors, "carrera", carrera, 2, MAJOR_MAX_LENGTH, "Escriba la carrera.");
  assignLengthError(errors, "nivel", nivel, 1, LEVEL_MAX_LENGTH, "Escriba el año o nivel.");
  assignTopicErrors(errors, temas, otroTema);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      nombre,
      identificacion,
      correo,
      telefono,
      carrera,
      nivel,
      temas,
      otroTema: temas.includes("otro") ? otroTema : null,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

function readTopics(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function uniqueTopics(topics: readonly string[]): string[] {
  return [...new Set(topics)];
}

function assignLengthError(
  errors: Record<string, string>,
  key: string,
  value: string,
  minLength: number,
  maxLength: number,
  message: string,
): void {
  if (value.length < minLength || value.length > maxLength) {
    errors[key] = message;
  }
}

function assignIdentificationError(errors: Record<string, string>, identificacion: string): void {
  const hasValidLength = identificacion.length >= IDENTIFICATION_MIN_LENGTH && identificacion.length <= IDENTIFICATION_MAX_LENGTH;
  if (!hasValidLength || !IDENTIFICATION_PATTERN.test(identificacion)) {
    errors.identificacion = "Escriba la identificación.";
  }
}

function assignEmailError(errors: Record<string, string>, correo: string): void {
  if (!EMAIL_PATTERN.test(correo) || correo.length > 248) {
    errors.correo = "Escriba el correo institucional.";
  }
}

function assignPhoneError(errors: Record<string, string>, telefono: string): void {
  const digits = telefono.replace(/\D/g, "");
  if (digits.length < PHONE_MIN_DIGITS || digits.length > PHONE_MAX_DIGITS) {
    errors.telefono = "Escriba un teléfono válido.";
  }
}

function assignTopicErrors(errors: Record<string, string>, temas: readonly string[], otroTema: string): void {
  if (temas.length === 0 || temas.some((topic) => !isOrientationTopic(topic))) {
    errors.temas = "Seleccione al menos un tema.";
    return;
  }
  if (temas.includes("otro") && otroTema.length === 0) {
    errors.otroTema = "Indique el otro tema.";
  }
  if (otroTema.length > OTHER_TOPIC_MAX_LENGTH) {
    errors.otroTema = "El otro tema es demasiado largo.";
  }
}

function isOrientationTopic(value: string): boolean {
  return TOPIC_CODES.some((code) => code === value);
}
