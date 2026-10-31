import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listOpenSlots } from "./list-open-slots.js";

describe("listOpenSlots", () => {
  it("hides weekends, the lunch hour, and anything inside 24 hours", () => {
    const thursdayAfternoon = new Date("2026-10-01T15:00:00-06:00");
    const actual = listOpenSlots(thursdayAfternoon, []);
    const friday = actual.filter((slot) => slot.fecha === "2026-10-02").map((slot) => slot.horaInicio);
    const weekend = actual.filter((slot) => slot.fecha === "2026-10-03" || slot.fecha === "2026-10-04");
    assert.deepEqual(friday, ["15:00", "16:00"]);
    assert.equal(weekend.length, 0);
    assert.equal(actual.some((slot) => slot.horaInicio === "12:00"), false);
  });

  it("removes a slot that is already taken", () => {
    const now = new Date("2026-10-01T08:00:00-06:00");
    const actual = listOpenSlots(now, ["2026-10-05|09:00"]);
    assert.equal(actual.some((slot) => slot.fecha === "2026-10-05" && slot.horaInicio === "09:00"), false);
  });
});
