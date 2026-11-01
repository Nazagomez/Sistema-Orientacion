import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prepareDatabaseConnection } from "./prepare-database-connection.js";

describe("prepareDatabaseConnection", () => {
  it("keeps a local database without SSL", () => {
    const actual = prepareDatabaseConnection("postgresql://orientacion:orientacion@localhost:5432/orientacion");
    assert.equal(actual.ssl, undefined);
    assert.equal(actual.connectionString.includes("localhost"), true);
  });

  it("requires SSL for Neon and drops channel binding", () => {
    const actual = prepareDatabaseConnection(
      "postgresql://neondb_owner:secret@ep-example.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    );
    assert.deepEqual(actual.ssl, { rejectUnauthorized: true });
    assert.equal(actual.connectionString.includes("channel_binding"), false);
    assert.equal(actual.connectionString.includes("sslmode=require"), true);
  });
});
