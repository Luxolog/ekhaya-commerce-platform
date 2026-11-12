const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Appwrite-Project, X-Appwrite-JWT",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

function response(res, body, status = 200) {
  res
    .setStatusCode(status)
    .setHeaders(corsHeaders)
    .send(JSON.stringify(body));
}

export default async ({ req, res, log, error }) => {
  if (req.method === "OPTIONS") return response(res, { ok: true });
  if (req.method !== "GET") return response(res, { error: "Method not allowed" }, 405);

  const userId = process.env.APPWRITE_FUNCTION_USER_ID;
  const userJwt = process.env.APPWRITE_FUNCTION_USER_JWT;
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;

  if (!userId || !userJwt || !endpoint || !projectId) {
    log("Missing Appwrite function user context.");
    return response(res, { error: "Authentication required", code: "AUTH_CONTEXT_MISSING" }, 401);
  }

  try {
    const accountResponse = await fetch(`${endpoint.replace(/\/$/, "")}/account`, {
      method: "GET",
      headers: {
        "X-Appwrite-Project": projectId,
        "X-Appwrite-JWT": userJwt,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!accountResponse.ok) {
      return response(res, { error: "Authentication could not be verified", code: "INVALID_SESSION" }, 401);
    }

    const account = await accountResponse.json();
    if (account.$id !== userId) {
      return response(res, { error: "Authenticated identity mismatch", code: "IDENTITY_MISMATCH" }, 403);
    }

    return response(res, {
      ok: true,
      authenticated: true,
      user: {
        id: account.$id,
        email: account.email,
        name: account.name,
        emailVerification: account.emailVerification,
      },
    });
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    return response(res, { error: "Identity verification unavailable", code: "IDENTITY_CHECK_FAILED" }, 503);
  }
};
