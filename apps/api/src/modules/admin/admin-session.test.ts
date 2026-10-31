import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { passwordsMatch, readAdminSubject, signAdminToken } from "./admin-session.js";

const SECRET = "local-dev-jwt-secret-orientacion";

describe("admin session", () => {
  it("reads the counselor email from a token it just signed", () => {
    const token = signAdminToken("nancy.zuniga.rangel@una.cr", SECRET);
    assert.equal(readAdminSubject(token, SECRET), "nancy.zuniga.rangel@una.cr");
  });

  it("rejects a token signed with another secret", () => {
    const token = signAdminToken("nancy.zuniga.rangel@una.cr", SECRET);
    assert.equal(readAdminSubject(token, "another-secret-value-xx"), null);
  });

  it("matches equal passwords and rejects different ones", () => {
    assert.equal(passwordsMatch("clave-local", "clave-local"), true);
    assert.equal(passwordsMatch("clave-local", "otra-clave"), false);
  });
});
