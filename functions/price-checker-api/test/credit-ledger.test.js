import test from "node:test";
import assert from "node:assert/strict";
import {
  creditEventRowId,
  transitionCredit,
  utcPeriodStart,
  validateCreditRequest,
} from "../src/credit-ledger.js";

const request = {
  userId: "user_123",
  requestId: "123e4567-e89b-42d3-a456-426614174000",
  marketplace: "takealot",
};

test("validates the composite credit request", () => {
  assert.equal(validateCreditRequest(request).ok, true);
  assert.equal(validateCreditRequest({ ...request, marketplace: "unknown" }).code, "INVALID_MARKETPLACE");
  assert.equal(validateCreditRequest({ ...request, requestId: "bad" }).code, "INVALID_REQUEST_ID");
});

test("derives a stable row ID from user, request and marketplace", () => {
  const first = creditEventRowId(request);
  assert.equal(first, creditEventRowId({ ...request }));
  assert.notEqual(first, creditEventRowId({ ...request, marketplace: "amazon" }));
  assert.notEqual(first, creditEventRowId({ ...request, userId: "user_456" }));
  assert.ok(first.length <= 36);
});

test("uses UTC month boundaries", () => {
  assert.equal(utcPeriodStart(new Date("2026-11-30T23:59:59.000Z")), "2026-11-01");
  assert.equal(utcPeriodStart(new Date("2026-12-01T00:00:00.000Z")), "2026-12-01");
});

test("only reserved credits can be completed, refunded or failed", () => {
  assert.deepEqual(transitionCredit("reserved", "complete"), { ok: true, state: "completed" });
  assert.deepEqual(transitionCredit("reserved", "refund"), { ok: true, state: "refunded" });
  assert.equal(transitionCredit("completed", "refund").code, "INVALID_STATE_TRANSITION");
  assert.equal(transitionCredit("refunded", "complete").code, "INVALID_STATE_TRANSITION");
});
