const DATABASE_ID = "ekhaya_price_checker";

export async function loadSellerCreditContext({ tablesDB, Query, authUserId, marketplace }) {
  if (!tablesDB || !Query?.equal) throw new TypeError("TablesDB and Query.equal are required");
  if (typeof authUserId !== "string" || !authUserId.trim()) {
    return { ok: false, status: 401, code: "AUTH_REQUIRED" };
  }
  if (!["takealot", "amazon", "makro"].includes(marketplace)) {
    return { ok: false, status: 400, code: "INVALID_MARKETPLACE" };
  }

  const profiles = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: "user_profiles",
    queries: [Query.equal("auth_user_id", [authUserId]), Query.limit(2)],
    total: false,
  });
  const profile = profiles.rows?.[0];
  if (!profile || profiles.rows.length !== 1) {
    return { ok: false, status: 403, code: "PROFILE_NOT_CONFIGURED" };
  }
  if (profile.account_status !== "active") {
    return { ok: false, status: 403, code: "ACCOUNT_INACTIVE" };
  }

  const access = Array.isArray(profile.marketplace_access) ? profile.marketplace_access : [];
  if (!access.includes(marketplace)) {
    return { ok: false, status: 403, code: "MARKETPLACE_NOT_ENABLED" };
  }

  const planCode = profile.plan_code;
  if (typeof planCode !== "string" || !planCode) {
    return { ok: false, status: 403, code: "PLAN_NOT_CONFIGURED" };
  }
  const allowances = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: "plan_search_allowances",
    queries: [Query.equal("plan_code", [planCode]), Query.limit(2)],
    total: false,
  });
  const allowance = allowances.rows?.[0];
  if (!allowance || allowances.rows.length !== 1 ||
      !Number.isSafeInteger(allowance.monthly_search_credits) ||
      allowance.monthly_search_credits < 0) {
    return { ok: false, status: 403, code: "PLAN_QUOTA_NOT_CONFIGURED" };
  }

  return {
    ok: true,
    value: {
      userId: authUserId,
      planCode,
      monthlyLimit: allowance.monthly_search_credits,
      marketplaceAccess: access,
    },
  };
}
