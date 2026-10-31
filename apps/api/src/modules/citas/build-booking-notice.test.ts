import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBookingNotice } from "./build-booking-notice.js";

describe("buildBookingNotice", () => {
  it("tells the counselor who booked and includes the calendar link", () => {
    const actual = buildBookingNotice({
      nombre: "Ana Solís",
      correo: "ana.solis@una.cr",
      fecha: "2026-10-05",
      horaInicio: "09:00",
      horaFin: "10:00",
      calendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE",
    });
    assert.equal(actual.subject, "Cita agendada · Ana Solís");
    assert.equal(actual.text.includes("Cita agendada."), true);
    assert.equal(actual.text.includes("ana.solis@una.cr"), true);
    assert.equal(actual.text.includes("5 de octubre"), true);
    assert.equal(actual.text.includes("09:00–10:00"), true);
    assert.equal(actual.text.includes("https://calendar.google.com/calendar/render?action=TEMPLATE"), true);
  });
});