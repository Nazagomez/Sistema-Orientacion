import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildGmailComposeUrl } from "./gmail-compose-url.js";

describe("buildGmailComposeUrl", () => {
  it("fills the Gmail compose form with the approval message", () => {
    const actual = new URL(buildGmailComposeUrl({
      from: "nancy.zuniga.rangel@una.cr",
      to: "ana.solis@una.cr",
      bcc: "nancy.zuniga.rangel@una.cr",
      subject: "Su cita ha sido aprobada",
      body: "Hola Ana:\n\nSu cita ha sido aprobada.",
    }));
    assert.equal(actual.origin + actual.pathname, "https://mail.google.com/mail/");
    assert.equal(actual.searchParams.get("view"), "cm");
    assert.equal(actual.searchParams.get("fs"), "1");
    assert.equal(actual.searchParams.get("authuser"), "nancy.zuniga.rangel@una.cr");
    assert.equal(actual.searchParams.get("to"), "ana.solis@una.cr");
    assert.equal(actual.searchParams.get("bcc"), "nancy.zuniga.rangel@una.cr");
    assert.equal(actual.searchParams.get("su"), "Su cita ha sido aprobada");
    assert.equal(actual.searchParams.get("body")?.includes("Hola Ana:"), true);
  });
});
