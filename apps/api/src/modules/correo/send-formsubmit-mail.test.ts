import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sendFormSubmitMail } from "./send-formsubmit-mail.js";

describe("sendFormSubmitMail", () => {
  it("posts the notice to the counselor inbox", async () => {
    let calledUrl = "";
    let calledBody = "";
    const fetchImpl = async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]): Promise<Response> => {
      calledUrl = String(input);
      calledBody = String(init?.body ?? "");
      return new Response(JSON.stringify({ success: "true" }), { status: 200 });
    };
    await sendFormSubmitMail({
      to: "nancy.zuniga.rangel@una.cr",
      subject: "Nueva solicitud de orientación",
      text: "Hay una nueva solicitud.",
    }, fetchImpl as typeof fetch);
    assert.equal(calledUrl, "https://formsubmit.co/ajax/nancy.zuniga.rangel%40una.cr");
    assert.equal(calledBody.includes("Nueva solicitud de orientación"), true);
    assert.equal(calledBody.includes("Hay una nueva solicitud."), true);
  });

  it("reports when the inbox has not accepted delivery", async () => {
    const fetchImpl = async (): Promise<Response> => new Response(JSON.stringify({ success: "false", message: "Needs activation" }), { status: 200 });
    await assert.rejects(
      () => sendFormSubmitMail({ to: "nancy.zuniga.rangel@una.cr", subject: "Aviso", text: "Hola" }, fetchImpl as typeof fetch),
      /confirmarlo una vez/,
    );
  });
});
