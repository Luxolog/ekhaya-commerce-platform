import test from "node:test";
import assert from "node:assert/strict";
import { createCreditService } from "../src/credit-service.js";

const base = {
  userId: "seller_001",
  requestId: "123e4567-e89b-42d3-a456-426614174000",
  marketplace: "takealot",
  periodStart: "2026-11-01",
  limit: 2,
  now: "2026-11-13T00:00:00.000Z",
};

function memoryStore() {
  const events = new Map();
  const usage = new Map();
  let chain = Promise.resolve();

  // Serializes test transactions to model the required atomic storage contract.
  return {
    events, usage,
    async withTransaction(work) {
      let release;
      const previous = chain;
      chain = new Promise((resolve) => { release = resolve; });
      await previous;
      const snapshotEvents = new Map(events);
      const snapshotUsage = new Map([...usage].map(([k, v]) => [k, { ...v }]));
      const tx = {
        getEvent: async (id) => events.get(id) ?? null,
        getUsage: async (userId, period) => usage.get(userId + ":" + period) ?? null,
        getOrCreateUsage: async (userId, period) => {
          const key = userId + ":" + period;
          if (!usage.has(key)) usage.set(key, { user_id: userId, period_start: period, searches_used: 0 });
          return usage.get(key);
        },
        createEvent: async (event) => { if (events.has(event.id)) throw new Error("duplicate"); events.set(event.id, event); },
        updateEvent: async (id, patch) => events.set(id, { ...events.get(id), ...patch }),
        incrementUsage: async (userId, period) => {
          const row = await tx.getOrCreateUsage(userId, period);
          row.searches_used += 1;
          return row;
        },
        decrementUsage: async (userId, period) => {
          const row = await tx.getUsage(userId, period);
          row.searches_used -= 1;
          return row;
        },
      };
      try { return await work(tx); }
      catch (error) {
        events.clear(); for (const [k,v] of snapshotEvents) events.set(k,v);
        usage.clear(); for (const [k,v] of snapshotUsage) usage.set(k,v);
        throw error;
      } finally { release(); }
    },
  };
}

test("reserves once for same request and marketplace", async () => {
  const store = memoryStore();
  const service = createCreditService(store);
  const [a,b] = await Promise.all([service.reserve(base), service.reserve(base)]);
  assert.equal([a,b].filter(x => x.charged).length, 1);
  assert.equal([a,b].filter(x => x.duplicate).length, 1);
  assert.equal(store.usage.get("seller_001:2026-11-01").searches_used, 1);
});

test("different marketplaces are distinct credit events", async () => {
  const store = memoryStore();
  const service = createCreditService(store);
  await service.reserve(base);
  const second = await service.reserve({ ...base, marketplace: "amazon" });
  assert.equal(second.charged, true);
  assert.equal(store.usage.get("seller_001:2026-11-01").searches_used, 2);
});

test("does not exceed monthly limit under concurrent requests", async () => {
  const store = memoryStore();
  const service = createCreditService(store);
  const requests = [0,1,2,3].map((n) => service.reserve({
    ...base,
    requestId: `123e4567-e89b-42d3-a456-42661417400${n}`,
  }));
  const results = await Promise.all(requests);
  assert.equal(results.filter(x => x.charged).length, 2);
  assert.equal(results.filter(x => x.reason === "MONTHLY_SEARCH_LIMIT").length, 2);
  assert.equal(store.usage.get("seller_001:2026-11-01").searches_used, 2);
});

test("refunds a reservation once and completion prevents later refund", async () => {
  const store = memoryStore();
  const service = createCreditService(store);
  await service.reserve(base);
  assert.deepEqual(await service.refund(base), { ok: true, status: "refunded" });
  assert.equal(store.usage.get("seller_001:2026-11-01").searches_used, 0);
  assert.equal((await service.refund(base)).ok, false);

  const other = { ...base, requestId: "123e4567-e89b-42d3-a456-426614174001" };
  await service.reserve(other);
  assert.deepEqual(await service.complete(other), { ok: true, status: "completed" });
  assert.equal((await service.refund(other)).ok, false);
  assert.equal(store.usage.get("seller_001:2026-11-01").searches_used, 1);
});
