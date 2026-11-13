import test from "node:test";
import assert from "node:assert/strict";
import { handleMarketplaceSearch } from "../src/marketplace-search.js";

const Query = {
  equal: (attribute, values) => ({ method: "equal", attribute, values }),
  limit: (value) => ({ method: "limit", values: [value] }),
};

function profileAndPlanClient() {
  return {
    async listRows({ tableId }) {
      if (tableId === "user_profiles") {
        return { rows: [{
          auth_user_id: "seller_001",
          account_status: "active",
          marketplace_access: ["takealot", "amazon"],
          plan_code: "starter",
        }] };
      }
      if (tableId === "plan_search_allowances") {
        return { rows: [{ plan_code: "starter", monthly_search_credits: 100 }] };
      }
      throw new Error("Unexpected table lookup");
    },
    async getRow({ tableId }) {
      if (tableId === "marketplace_price_cache") {
        return {
          marketplace: "amazon",
          expires_at: "2026-12-01T00:00:00.000Z",
          fetched_at: "2026-11-13T00:00:00.000Z",
          source_payload: JSON.stringify({ products: [{ title: "Cached test product", price: 99 }] }),
        };
      }
      throw new Error("Unexpected row lookup");
    },
  };
}

test("serves a fresh cache hit without charging credits or calling ReefAPI", async () => {
  const result = await handleMarketplaceSearch({
    body: {
      marketplace: "amazon",
      query: "test product",
      request_id: "123e4567-e89b-42d3-a456-426614174000",
    },
    authUserId: "seller_001",
    tablesDB: profileAndPlanClient(),
    Query,
    env: {},
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.source, "cache");
  assert.equal(result.body.credit_charged, false);
  assert.equal(result.body.products[0].title, "Cached test product");
});

test("does not claim Makro live search is available", async () => {
  const result = await handleMarketplaceSearch({
    body: { marketplace: "makro", query: "test product" },
    authUserId: "seller_001",
    tablesDB: profileAndPlanClient(),
    Query,
    env: {},
  });
  assert.equal(result.status, 501);
  assert.equal(result.body.code, "MARKETPLACE_UNAVAILABLE");
});

test("rejects malformed requests before accessing Appwrite", async () => {
  const result = await handleMarketplaceSearch({
    body: { marketplace: "amazon", query: "x", request_id: "bad" },
    authUserId: "seller_001",
    tablesDB: {},
    Query,
    env: {},
  });
  assert.equal(result.status, 400);
  assert.equal(result.body.code, "INVALID_SEARCH");
});
