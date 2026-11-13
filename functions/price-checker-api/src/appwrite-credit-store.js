import { createHash } from "node:crypto";

const DATABASE_ID = "ekhaya_price_checker";
const EVENTS_TABLE = "search_credit_events_v2";
const USAGE_TABLE = "monthly_search_usage";

function usageRowId(userId, periodStart) {
  const digest = createHash("sha256")
    .update(`${userId}\\u0000${periodStart}`)
    .digest("hex")
    .slice(0, 32);
  return `mu_${digest}`;
}

function notFound(error) {
  return error?.code === 404 || error?.code === 1203 ||
    error?.type === "row_not_found" || /not found/i.test(error?.message ?? "");
}

/**
 * Appwrite TablesDB transaction adapter.
 *
 * Query.equal must be supplied from the installed Appwrite SDK. All writes are
 * staged and committed together. A transaction conflict is intentionally
 * surfaced to the caller for a bounded retry at the request boundary.
 */
export function createAppwriteCreditStore({ tablesDB, Query }) {
  if (!tablesDB || !Query?.equal) {
    throw new TypeError("TablesDB and Query.equal are required");
  }

  async function findUsage(userId, periodStart, transactionId) {
    const result = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: USAGE_TABLE,
      queries: [
        Query.equal("user_id", [userId]),
        Query.equal("period_start", [periodStart]),
        Query.limit(1),
      ],
      transactionId,
      total: false,
    });
    return result.rows?.[0] ?? null;
  }

  async function findEvent(eventId) {
    try {
      return await tablesDB.getRow({
        databaseId: DATABASE_ID,
        tableId: EVENTS_TABLE,
        rowId: eventId,
      });
    } catch (error) {
      if (notFound(error)) return null;
      throw error;
    }
  }

  return {
    async withTransaction(work) {
      const transaction = await tablesDB.createTransaction({ ttl: 60 });
      const transactionId = transaction.$id;
      const operations = [];
      let committed = false;

      const tx = {
        getEvent: async (id) => findEvent(id),
        getUsage: async (userId, periodStart) =>
          findUsage(userId, periodStart, transactionId),

        getOrCreateUsage: async (userId, periodStart) => {
          const existing = await findUsage(userId, periodStart, transactionId);
          if (existing) return existing;

          const id = usageRowId(userId, periodStart);
          const row = {
            $id: id,
            user_id: userId,
            period_start: periodStart,
            searches_used: 0,
            updated_at: new Date().toISOString(),
          };
          operations.push({
            action: "create",
            databaseId: DATABASE_ID,
            tableId: USAGE_TABLE,
            rowId: id,
            data: {
              user_id: row.user_id,
              period_start: row.period_start,
              searches_used: row.searches_used,
              updated_at: row.updated_at,
            },
          });
          return row;
        },

        createEvent: async (event) => {
          operations.push({
            action: "create",
            databaseId: DATABASE_ID,
            tableId: EVENTS_TABLE,
            rowId: event.id,
            data: {
              user_id: event.user_id,
              period_start: event.period_start,
              request_id: event.request_id,
              marketplace: event.marketplace,
              status: event.status,
              created_at: event.created_at,
            },
          });
        },

        incrementUsage: async (userId, periodStart, limit) => {
          const existing = await findUsage(userId, periodStart, transactionId);
          const row = existing ?? await findUsage(userId, periodStart, transactionId);
          if (row) {
            operations.push({
              action: "increment",
              databaseId: DATABASE_ID,
              tableId: USAGE_TABLE,
              rowId: row.$id,
              data: { column: "searches_used", value: 1, min: 0, max: limit },
            });
            return { ...row, searches_used: row.searches_used + 1 };
          }

          // A usage row created earlier in this transaction is already staged.
          const staged = operations.find((op) =>
            op.action === "create" && op.tableId === USAGE_TABLE &&
            op.data.user_id === userId && op.data.period_start === periodStart
          );
          if (!staged) throw new Error("Usage row was not staged before increment");
          staged.data.searches_used = 1;
          return { $id: staged.rowId, ...staged.data };
        },

        updateEvent: async (id, patch) => {
          operations.push({
            action: "update",
            databaseId: DATABASE_ID,
            tableId: EVENTS_TABLE,
            rowId: id,
            data: patch,
          });
        },

        decrementUsage: async (userId, periodStart) => {
          const row = await findUsage(userId, periodStart, transactionId);
          if (!row) throw new Error("Usage row not found for credit refund");
          operations.push({
            action: "decrement",
            databaseId: DATABASE_ID,
            tableId: USAGE_TABLE,
            rowId: row.$id,
            data: { column: "searches_used", value: 1, min: 0 },
          });
        },
      };

      try {
        const result = await work(tx);
        if (operations.length) {
          await tablesDB.createOperations({ transactionId, operations });
        }
        await tablesDB.updateTransaction({ transactionId, commit: true });
        committed = true;
        return result;
      } catch (error) {
        if (!committed) {
          try {
            await tablesDB.updateTransaction({ transactionId, rollback: true });
          } catch {
            // Preserve the original failure; transaction TTL is the final safety net.
          }
        }
        throw error;
      }
    },
  };
}
