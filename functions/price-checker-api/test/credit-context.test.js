import test from "node:test";
import assert from "node:assert/strict";
import { loadSellerCreditContext } from "../src/credit-context.js";

const Query = {
  equal: (attribute, values) => ({ method: "equal", attribute, values }),
  limit: (value) => ({ method: "limit", values: [value] }),
};

function client(profile, allowance) {
  return {
    async listRows({ tableId }) {
      if (tableId === "user_profiles") return { rows: profile ? [profile] : [] };
      if (tableId === "plan_search_allowances") return { rows: allowance ? [allowance] : [] };
      throw new Error("Unexpected table");
    },
  };
}

test("derives user, marketplace access and quota from Appwrite records", async () => {
  const result = await loadSellerCreditContext({
    tablesDB: client({
      auth_user_id: "verified_user",
      account_status: "active",
      marketplace_access: ["takealot", "amazon"],
      plan_code: "starter",
    }, { plan_code: "starter", monthly_search_credits: 100 }),
    Query,
    authUserId: "verified_user",
    marketplace: "amazon",
  });
  assert.deepEqual(result, {
    ok: true,
    value: {
      userId: "verified_user",
      planCode: "starter",
      monthlyLimit: 100,
      marketplaceAccess: ["takealot", "amazon"],
    },
  });
});

test("fails closed when profile, account, marketplace or quota is invalid", async () => {
  const missing = await loadSellerCreditContext({
    tablesDB: client(null, null), Query, authUserId: "verified_user", marketplace: "takealot",
  });
  assert.equal(missing.code, "PROFILE_NOT_CONFIGURED");

  const suspended = await loadSellerCreditContext({
    tablesDB: client({ account_status: "suspended" }, null), Query,
    authUserId: "verified_user", marketplace: "takealot",
  });
  assert.equal(suspended.code, "ACCOUNT_INACTIVE");

  const denied = await loadSellerCreditContext({
    tablesDB: client({ account_status: "active", marketplace_access: ["amazon"], plan_code: "starter" }, null),
    Query, authUserId: "verified_user", marketplace: "takealot",
  });
  assert.equal(denied.code, "MARKETPLACE_NOT_ENABLED");

  const noAllowance = await loadSellerCreditContext({
    tablesDB: client({ account_status: "active", marketplace_access: ["takealot"], plan_code: "starter" }, null),
    Query, authUserId: "verified_user", marketplace: "takealot",
  });
  assert.equal(noAllowance.code, "PLAN_QUOTA_NOT_CONFIGURED");
});
