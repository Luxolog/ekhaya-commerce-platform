import { createHash } from "node:crypto";

export const SUPPORTED_MARKETPLACES = Object.freeze(["takealot", "amazon", "makro"]);
export const CREDIT_STATES = Object.freeze(["reserved", "completed", "refunded", "failed"]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateCreditRequest(input) {
  if (!input || typeof input !== "object") return { ok: false, code: "INVALID_REQUEST" };
  if (typeof input.userId !== "string" || !input.userId.trim()) return { ok: false, code: "INVALID_USER" };
  if (typeof input.requestId !== "string" || !UUID_PATTERN.test(input.requestId)) return { ok: false, code: "INVALID_REQUEST_ID" };
  if (!SUPPORTED_MARKETPLACES.includes(input.marketplace)) return { ok: false, code: "INVALID_MARKETPLACE" };
  return {
    ok: true,
    value: {
      userId: input.userId.trim(),
      requestId: input.requestId.toLowerCase(),
      marketplace: input.marketplace,
    },
  };
}

/**
 * Stable key for the source schema's composite idempotency tuple.
 * This is deliberately separate from request_id: one logical search request
 * may reserve credits independently for more than one marketplace.
 */
export function creditEventRowId({ userId, requestId, marketplace }) {
  const tuple = JSON.stringify([userId, requestId.toLowerCase(), marketplace]);
  const digest = createHash("sha256").update(tuple).digest("hex").slice(0, 32);
  return `cr_${digest}`;
}

export function utcPeriodStart(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError("A valid Date is required");
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

export function transitionCredit(currentState, action) {
  const transitions = {
    reserved: { complete: "completed", refund: "refunded", fail: "failed" },
    completed: {},
    refunded: {},
    failed: {},
  };
  if (!CREDIT_STATES.includes(currentState)) {
    return { ok: false, code: "INVALID_CURRENT_STATE" };
  }
  const nextState = transitions[currentState][action];
  if (!nextState) return { ok: false, code: "INVALID_STATE_TRANSITION", state: currentState };
  return { ok: true, state: nextState };
}

/**
 * This module contains deterministic domain rules only. Database writes must
 * be performed by a server-side transaction after authorization; do not
 * replace the source composite unique constraint with a read-then-write check.
 */
