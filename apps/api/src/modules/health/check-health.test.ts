import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { HealthDatabase } from "../../database/health-database.js";
import { checkHealth } from "./check-health.js";

describe("checkHealth", () => {
  it("reports the database as up when the query succeeds", async () => {
    const database: HealthDatabase = {
      async query() {
        return { rowCount: 1 };
      },
    };
    const actual = await checkHealth(database);
    assert.equal(actual.status, "ok");
    assert.equal(actual.database, "up");
    assert.equal(typeof actual.checkedAt, "string");
  });

  it("reports the database as down when the query fails", async () => {
    const database: HealthDatabase = {
      async query() {
        throw new Error("connection refused");
      },
    };
    const actual = await checkHealth(database);
    assert.equal(actual.status, "error");
    assert.equal(actual.database, "down");
  });
});
