import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ActiveRequestError } from "./active-request-error.js";
import { createOrientationRequest } from "./create-orientation-request.js";
import type { OrientationRequest } from "./orientation-request.js";
import type { OrientationRequestRepository } from "./orientation-request-repository.js";

const inputRequest: OrientationRequest = {
  nombre: "Ana Solís",
  identificacion: "123456789",
  correo: "ana.solis@una.cr",
  telefono: "88887777",
  carrera: "Orientación",
  nivel: "Segundo año",
  temas: ["asesoria-vocacional"],
  otroTema: null,
};

describe("createOrientationRequest", () => {
  it("stores the request when the student has none open", async () => {
    const repository: OrientationRequestRepository = {
      async hasActiveRequest() {
        return false;
      },
      async insert() {
        return { id: "request-1" };
      },
    };
    const actual = await createOrientationRequest(repository, inputRequest);
    assert.equal(actual.id, "request-1");
  });

  it("rejects a second open request for the same email", async () => {
    const repository: OrientationRequestRepository = {
      async hasActiveRequest() {
        return true;
      },
      async insert() {
        throw new Error("insert should not run");
      },
    };
    await assert.rejects(
      () => createOrientationRequest(repository, inputRequest),
      ActiveRequestError,
    );
  });
});
