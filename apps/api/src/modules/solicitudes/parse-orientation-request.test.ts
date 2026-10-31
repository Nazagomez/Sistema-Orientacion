import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseOrientationRequest } from "./parse-orientation-request.js";

const validBody = {
  nombre: "Ana Solís",
  identificacion: "123456789",
  correo: "ana.solis@una.cr",
  telefono: "8888-7777",
  carrera: "Orientación",
  nivel: "Segundo año",
  temas: ["asesoria-vocacional"],
  otroTema: "",
};

describe("parseOrientationRequest", () => {
  it("accepts a complete student form", () => {
    const actual = parseOrientationRequest(validBody);
    assert.equal(actual.ok, true);
    if (actual.ok) {
      assert.equal(actual.value.correo, "ana.solis@una.cr");
      assert.equal(actual.value.otroTema, null);
      assert.deepEqual(actual.value.temas, ["asesoria-vocacional"]);
    }
  });

  it("rejects an empty form", () => {
    const actual = parseOrientationRequest({});
    assert.equal(actual.ok, false);
    if (!actual.ok) {
      assert.equal(typeof actual.errors.nombre, "string");
      assert.equal(typeof actual.errors.temas, "string");
    }
  });

  it("requires the other topic when Otro is selected", () => {
    const actual = parseOrientationRequest({ ...validBody, temas: ["otro"], otroTema: "" });
    assert.equal(actual.ok, false);
    if (!actual.ok) {
      assert.equal(actual.errors.otroTema, "Indique el otro tema.");
    }
  });
});
