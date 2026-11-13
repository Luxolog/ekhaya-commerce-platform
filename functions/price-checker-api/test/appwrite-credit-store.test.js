import test from "node:test";
import assert from "node:assert/strict";
import { createAppwriteCreditStore } from "../src/appwrite-credit-store.js";

const Query = {
  equal: (attribute, values) => ({ method: "equal", attribute, values }),
  limit: (value) => ({ method: "limit", values: [value] }),
};

test("requires the TablesDB client and query builder", () => {
  assert.throws(() => createAppwriteCreditStore({}), /TablesDB and Query.equal/);
});

test("stages event creation and usage increment in one transaction", async () => {
  const calls = [];
  const usage = { $id: "existing_usage", user_id: "seller", period_start: "2026-11-01", searches_used: 4 };
  const tablesDB = {
    createTransaction: async () => ({ $id: "tx_1" }),
    listRows: async (args) => {
      calls.push(["listRows", args]);
      return { rows: [usage] };
    },
    getRow: async () => { throw Object.assign(new Error("not found"), { code: 404 }); },
    createOperations: async (args) => calls.push(["createOperations", args]),
    updateTransaction: async (args) => calls.push(["updateTransaction", args]),
  };
  const store = createAppwriteCreditStore({ tablesDB, Query });
  const result = await store.withTransaction(async (tx) => {
    assert.equal(await tx.getEvent("event_1"), null);
    await tx.createEvent({
      id: "event_1", user_id: "seller", period_start: "2026-11-01",
      request_id: "request", marketplace: "takealot", status: "reserved",
      created_at: "2026-11-13T00:00:00.000Z",
    });
    const row = await tx.getOrCreateUsage("seller", "2026-11-01");
    assert.equal(row.searches_used, 4);
    return await tx.incrementUsage("seller", "2026-11-01", 5);
  });
  assert.equal(result.searches_used, 5);
  const staged = calls.find(([name]) => name === "createOperations")[1].operations;
  assert.deepEqual(staged.map((op) => op.action), ["create", "increment"]);
  assert.equal(staged[1].data.max, 5);
  assert.deepEqual(calls.at(-1), ["updateTransaction", { transactionId: "tx_1", commit: true }]);
});

test("rolls back transaction when domain operation fails", async () => {
  const calls = [];
  const tablesDB = {
    createTransaction: async () => ({ $id: "tx_2" }),
    updateTransaction: async (args) => calls.push(args),
  };
  const store = createAppwriteCreditStore({ tablesDB, Query });
  await assert.rejects(
    store.withTransaction(async () => { throw new Error("test failure"); }),
    /test failure/
  );
  assert.deepEqual(calls, [{ transactionId: "tx_2", rollback: true }]);
});
