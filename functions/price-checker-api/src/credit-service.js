import {
  creditEventRowId,
  transitionCredit,
  validateCreditRequest,
} from "./credit-ledger.js";

/**
 * Transactional credit service.
 *
 * The storage adapter MUST implement each method using one Appwrite
 * TablesDB transaction. A read-then-write implementation is not acceptable.
 * Authorization and plan/account validation happen before reserve() is called.
 */
export function createCreditService(store) {
  if (!store || typeof store.withTransaction !== "function") {
    throw new TypeError("A transaction-capable credit store is required");
  }

  return {
    async reserve(input) {
      const validated = validateCreditRequest(input);
      if (!validated.ok) return { allowed: false, reason: validated.code };

      const request = validated.value;
      const periodDate = typeof input.periodStart === "string"
        ? new Date(`${input.periodStart}T00:00:00.000Z`)
        : null;
      if (!periodDate || !/^\d{4}-\d{2}-01$/.test(input.periodStart) ||
          Number.isNaN(periodDate.getTime()) ||
          periodDate.toISOString().slice(0, 10) !== input.periodStart) {
        return { allowed: false, reason: "INVALID_PERIOD" };
      }
      if (!Number.isSafeInteger(input.limit) || input.limit < 0) {
        return { allowed: false, reason: "INVALID_LIMIT" };
      }
      if (typeof input.now !== "string" || Number.isNaN(Date.parse(input.now))) {
        return { allowed: false, reason: "INVALID_TIMESTAMP" };
      }
      const eventId = creditEventRowId(request);

      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          return await store.withTransaction(async (tx) => {
          const existing = await tx.getEvent(eventId);
          if (existing) {
            return {
              allowed: true,
              charged: false,
              duplicate: true,
              used: (await tx.getUsage(request.userId, input.periodStart))?.searches_used ?? 0,
              limit: input.limit,
            };
          }

          const usage = await tx.getOrCreateUsage(request.userId, input.periodStart);
          if (usage.searches_used >= input.limit) {
            return {
              allowed: false,
              reason: "MONTHLY_SEARCH_LIMIT",
              used: usage.searches_used,
              limit: input.limit,
            };
          }

          await tx.createEvent({
            id: eventId,
            user_id: request.userId,
            request_id: request.requestId,
            marketplace: request.marketplace,
            period_start: input.periodStart,
            status: "reserved",
            created_at: input.now,
          });
          const updated = await tx.incrementUsage(request.userId, input.periodStart, input.limit);

          return {
            allowed: true,
            charged: true,
            duplicate: false,
            used: updated.searches_used,
            limit: input.limit,
          };
          });
        } catch (error) {
          const conflict = error?.code === 409 ||
            /transaction.*conflict|row.*already.*exists|unique.*constraint/i.test(
              `${error?.type ?? ""} ${error?.message ?? ""}`
            );
          if (!conflict) throw error;

          // Identical requests are idempotent; unrelated transaction conflicts
          // retry a small bounded number of times to resolve quota contention.
          if (typeof store.getEvent === "function") {
            const winner = await store.getEvent(eventId);
            if (winner) {
              const usage = await store.getUsage?.(request.userId, input.periodStart);
              return {
                allowed: true,
                charged: false,
                duplicate: true,
                used: usage?.searches_used ?? 0,
                limit: input.limit,
              };
            }
          }
          if (attempt === maxAttempts) throw error;
        }
      }
      throw new Error("Credit reservation retry limit reached");
    },

    async complete(input) {
      return transition(store, input, "complete", input.now);
    },

    async refund(input) {
      return transition(store, input, "refund", input.now);
    },
  };
}

async function transition(store, input, action, now) {
  const validated = validateCreditRequest(input);
  if (!validated.ok) return { ok: false, reason: validated.code };
  const request = validated.value;
  const eventId = creditEventRowId(request);

  return store.withTransaction(async (tx) => {
    const event = await tx.getEvent(eventId);
    if (!event) return { ok: false, reason: "CREDIT_EVENT_NOT_FOUND" };

    const next = transitionCredit(event.status, action);
    if (!next.ok) return { ok: false, reason: next.code };

    await tx.updateEvent(eventId, {
      status: next.state,
      ...(action === "complete" ? { completed_at: now } : {}),
    });

    if (action === "refund") {
      const usage = await tx.getUsage(request.userId, event.period_start);
      if (!usage || usage.searches_used < 1) {
        throw new Error("Credit ledger invariant violated: usage counter cannot be decremented");
      }
      await tx.decrementUsage(request.userId, event.period_start);
    }

    return { ok: true, status: next.state };
  });
}
