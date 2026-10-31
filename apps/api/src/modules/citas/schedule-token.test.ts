import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createScheduleToken, readScheduleToken } from "./schedule-token.js";

const SECRET = "local-dev-schedule-secret";

describe("schedule tokens", () => {
  it("reads the request id from a token it just created", () => {
    const token = createScheduleToken("6d9f2e3a-1b4c-4d5e-8f70-123456789abc", SECRET);
    const actual = readScheduleToken(token, SECRET);
    assert.equal(actual, "6d9f2e3a-1b4c-4d5e-8f70-123456789abc");
  });

  it("rejects a token signed with another secret", () => {
    const token = createScheduleToken("6d9f2e3a-1b4c-4d5e-8f70-123456789abc", SECRET);
    assert.equal(readScheduleToken(token, "another-secret-value"), null);
  });
});
