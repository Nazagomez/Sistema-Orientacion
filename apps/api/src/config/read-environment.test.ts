import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readEnvironment } from "./read-environment.js";

describe("readEnvironment", () => {
  it("returns the configured port, database URL, and CORS origin", () => {
    const actual = readEnvironment({
      DATABASE_URL: "postgresql://orientacion:orientacion@localhost:5432/orientacion",
      PORT: "3001",
      CORS_ORIGIN: "http://localhost:5173",
    });
    assert.equal(actual.port, 3001);
    assert.equal(actual.databaseUrl.includes("orientacion"), true);
    assert.equal(actual.corsOrigin, "http://localhost:5173");
  });

  it("uses the public host address when no CORS origin is set", () => {
    const actual = readEnvironment({
      DATABASE_URL: "postgresql://localhost/orientacion",
      RENDER_EXTERNAL_URL: "https://sistema-orientacion.onrender.com",
    });
    assert.equal(actual.corsOrigin, "https://sistema-orientacion.onrender.com");
  });

  it("rejects a missing database URL", () => {
    assert.throws(() => readEnvironment({}), /DATABASE_URL is required/);
  });

  it("rejects a port outside the valid range", () => {
    assert.throws(
      () =>
        readEnvironment({
          DATABASE_URL: "postgresql://localhost/orientacion",
          PORT: "70000",
        }),
      /PORT must be an integer/,
    );
  });
});
