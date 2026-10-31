import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveAppointmentClose } from "./resolve-appointment-close.js";

describe("resolveAppointmentClose", () => {
  it("finishes the request when the appointment was attended", () => {
    assert.deepEqual(resolveAppointmentClose("completar"), {
      citaEstado: "COMPLETADA",
      solicitudEstado: "FINALIZADA",
    });
  });

  it("finishes the request when the student did not attend", () => {
    assert.deepEqual(resolveAppointmentClose("no-asistio"), {
      citaEstado: "NO_ASISTIO",
      solicitudEstado: "FINALIZADA",
    });
  });

  it("reopens the request when the appointment is cancelled", () => {
    assert.deepEqual(resolveAppointmentClose("cancelar"), {
      citaEstado: "CANCELADA",
      solicitudEstado: "APROBADA",
    });
  });

  it("rejects an unknown action", () => {
    assert.equal(resolveAppointmentClose("otro"), null);
  });
});
