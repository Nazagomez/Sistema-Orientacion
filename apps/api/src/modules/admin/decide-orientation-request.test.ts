import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideOrientationRequest } from "./decide-orientation-request.js";

describe("decideOrientationRequest", () => {
  it("approves a pending request", () => {
    const actual = decideOrientationRequest({
      currentEstado: "PENDIENTE",
      decision: "aprobar",
      observacion: "",
    });
    assert.equal(actual.ok, true);
    if (actual.ok) {
      assert.equal(actual.estado, "APROBADA");
    }
  });

  it("requires an observation when the request is not approved", () => {
    const actual = decideOrientationRequest({
      currentEstado: "PENDIENTE",
      decision: "no-aprobar",
      observacion: " ",
    });
    assert.equal(actual.ok, false);
    if (!actual.ok) {
      assert.equal(actual.statusCode, 400);
    }
  });

  it("refuses to resolve a request that is no longer pending", () => {
    const actual = decideOrientationRequest({
      currentEstado: "APROBADA",
      decision: "aprobar",
      observacion: "",
    });
    assert.equal(actual.ok, false);
    if (!actual.ok) {
      assert.equal(actual.statusCode, 409);
    }
  });
});
