import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRequestNotice } from "./build-request-notice.js";

describe("buildRequestNotice", () => {
  it("describes the student request for the counselor inbox", () => {
    const reviewUrl = "http://localhost:5173/admin/solicitudes/11111111-1111-4111-8111-111111111111";
    const actual = buildRequestNotice({
      nombre: "Ana Solís",
      identificacion: "123456789",
      correo: "ana.solis@una.cr",
      telefono: "8888-7777",
      carrera: "Orientación",
      nivel: "Segundo año",
      temas: ["asesoria-vocacional", "otro"],
      otroTema: "Cambio de carrera",
    }, reviewUrl);
    assert.equal(actual.subject, "Nueva solicitud de orientación · Ana Solís");
    assert.equal(actual.text.startsWith("Nueva solicitud."), true);
    assert.equal(actual.text.includes("Correo: ana.solis@una.cr"), true);
    assert.equal(actual.text.includes("Asesoría vocacional"), true);
    assert.equal(actual.text.includes("Otro tema: Cambio de carrera"), true);
    assert.equal(actual.text.includes(reviewUrl), true);
  });
});