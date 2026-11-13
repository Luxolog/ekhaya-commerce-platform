import test from "node:test";
import assert from "node:assert/strict";
import { createCreditService } from "../src/credit-service.js";

const valid = {
  userId: "seller_001",
  requestId: "123e4567-e89b-42d3-a456-426614174000",
  marketplace: "takealot",
  periodStart: "2026-11-01",
  limit: 10,
  now: "2026-11-13T00:00:00.000Z",
};

test("rejects impossible or malformed UTC month starts", async () => {
  const service = createCreditService({ withTransaction: async () => { throw new Error("must not transact"); } });
  for (const periodStart of ["2026-13-01", "2026-02-30", "2026-11-02", "2026-1-01", "bad"]) {
    const result = await service.reserve({ ...valid, periodStart });
    assert.deepEqual(result, { allowed: false, reason: "INVALID_PERIOD" });
  }
});

test("rejects client-provided invalid quota and timestamp", async () => {
  const service = createCreditService({ withTransaction: async () => { throw new Error("must not transact"); } });
  assert.equal((await service.reserve({ ...valid, limit: -1 })).reason, "INVALID_LIMIT");
  assert.equal((await service.reserve({ ...valid, limit: 1.5 })).reason, "INVALID_LIMIT");
  assert.equal((await service.reserve({ ...valid, now: "not-a-date" })).reason, "INVALID_TIMESTAMP");
});
