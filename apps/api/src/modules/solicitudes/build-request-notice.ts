import type { OrientationRequest } from "./orientation-request.js";

const TOPIC_NAMES: Readonly<Record<string, string>> = {
  "asesoria-vocacional": "Asesoría vocacional",
  "adaptacion-universitaria": "Adaptación a la vida universitaria",
  "relaciones-interpersonales": "Relaciones interpersonales en la universidad",
  "organizacion-tiempo": "Organización del tiempo y hábitos de estudio",
  "gestion-emociones": "Gestión de emociones",
  "resolucion-conflictos": "Solución de conflictos",
  "rendimiento-academico": "Rendimiento académico",
  otro: "Otro",
};

type RequestNotice = {
  readonly subject: string;
  readonly text: string;
};

/**
 * Text of the notice sent to the counselor when a student submits a request.
 * The link opens that request in the approval screen.
 */
export function buildRequestNotice(request: OrientationRequest, reviewUrl: string): RequestNotice {
  const topics = request.temas.map((code) => TOPIC_NAMES[code] ?? code).join(", ");
  const lines = [
    "Nueva solicitud.",
    "",
    `Nombre: ${request.nombre}`,
    `Identificación: ${request.identificacion}`,
    `Correo: ${request.correo}`,
    `Teléfono: ${request.telefono}`,
    `Carrera: ${request.carrera}`,
    `Año o nivel: ${request.nivel}`,
    `Temas: ${topics}`,
  ];
  if (request.otroTema) {
    lines.push(`Otro tema: ${request.otroTema}`);
  }
  lines.push("", "Para aprobarla o rechazarla, abra este enlace:", "", reviewUrl);
  return { subject: `Nueva solicitud de orientación · ${request.nombre}`, text: lines.join("\n") };
}
