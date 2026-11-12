import "server-only";

const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

export const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID ?? "ekhaya_price_checker";

export function requireAppwriteConfig() {
  if (!endpoint || !projectId || !apiKey) {
    throw new Error("Appwrite server configuration is incomplete.");
  }
  return { endpoint: endpoint.replace(/\/$/, ""), projectId, apiKey };
}

/**
 * Server-only Appwrite REST helper.
 * API keys must never be sent to the browser. Calls made with this key bypass
 * row permissions, so every caller must authenticate and authorize the user
 * before reading or writing private records.
 */
export async function appwriteServerRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const config = requireAppwriteConfig();
  const response = await fetch(`${config.endpoint}/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      "X-Appwrite-Project": config.projectId,
      "X-Appwrite-Key": config.apiKey,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload.message === "string"
        ? payload.message
        : `Appwrite request failed (${response.status}).`;
    throw new Error(message);
  }
  return payload as T;
}

export function appwriteTablePath(tableId: string, suffix = "") {
  const databaseId = encodeURIComponent(APPWRITE_DATABASE_ID);
  const table = encodeURIComponent(tableId);
  return `tablesdb/${databaseId}/tables/${table}${suffix}`;
}
