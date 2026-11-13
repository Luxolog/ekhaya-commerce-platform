import { createAppwriteAdminClient } from "./appwrite-client.js";
import { handleMarketplaceSearch } from "./marketplace-search.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Appwrite-Project, X-Appwrite-JWT, X-Appwrite-User-JWT",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function response(res, body, status = 200) {
  return res.json(body, status, corsHeaders);
}

async function verifyIdentity({ userId, userJwt, endpoint, projectId }) {
  if (!userId || !userJwt || !endpoint || !projectId) {
    return { ok: false, status: 401, body: { error: "Authentication required", code: "AUTH_CONTEXT_MISSING" } };
  }

  const accountResponse = await fetch(`${endpoint.replace(/\/$/, "")}/account`, {
    method: "GET",
    headers: {
      "X-Appwrite-Project": projectId,
      "X-Appwrite-JWT": userJwt,
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!accountResponse.ok) {
    return { ok: false, status: 401, body: { error: "Authentication could not be verified", code: "INVALID_SESSION" } };
  }

  const account = await accountResponse.json();
  if (account.$id !== userId) {
    return { ok: false, status: 403, body: { error: "Authenticated identity mismatch", code: "IDENTITY_MISMATCH" } };
  }

  return { ok: true, account };
}

export default async ({ req, res, error }) => {
  if (req.method === "OPTIONS") return response(res, { ok: true });
  if (req.method !== "GET" && req.method !== "POST") {
    return response(res, { error: "Method not allowed" }, 405);
  }

  // Appwrite supplies the authenticated caller context in request headers.
  // These values must never be accepted from the JSON request body.
  const userId = req.headers?.["x-appwrite-user-id"];
  const userJwt = req.headers?.["x-appwrite-user-jwt"];
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;

  try {
    const identity = await verifyIdentity({ userId, userJwt, endpoint, projectId });
    if (!identity.ok) return response(res, identity.body, identity.status);

    if (req.method === "GET") {
      return response(res, {
        ok: true,
        authenticated: true,
        user: {
          id: identity.account.$id,
          email: identity.account.email,
          name: identity.account.name,
          emailVerification: identity.account.emailVerification,
        },
      });
    }

    let body;
    try {
      body = req.bodyJson;
      if (body === undefined && typeof req.bodyText === "string") {
        body = JSON.parse(req.bodyText);
      }
    } catch {
      return response(res, { error: "Valid JSON required", code: "INVALID_JSON" }, 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return response(res, { error: "A JSON object is required", code: "INVALID_BODY" }, 400);
    }

    const { tablesDB, Query } = createAppwriteAdminClient();
    const result = await handleMarketplaceSearch({
      body,
      authUserId: identity.account.$id,
      tablesDB,
      Query,
    });
    return response(res, result.body, result.status);
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return response(res, {
      error: "Marketplace search could not be completed.",
      code: "SEARCH_FAILED",
      detail: process.env.NODE_ENV === "development" ? message : undefined,
    }, 502);
  }
};
