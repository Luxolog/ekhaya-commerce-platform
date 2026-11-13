import { Client, Query, TablesDB } from "node-appwrite";

export function createAppwriteAdminClient(env = process.env) {
  const endpoint = env.APPWRITE_FUNCTION_API_ENDPOINT;
  const projectId = env.APPWRITE_FUNCTION_PROJECT_ID;
  // Appwrite injects a short-lived key into each function execution. Prefer it
  // so database access stays scoped to the permissions configured on the function.
  const apiKey = env.APPWRITE_FUNCTION_API_KEY || env.APPWRITE_API_KEY;

  if (!endpoint || !projectId || !apiKey) {
    throw new Error("Appwrite function database access is not configured");
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  return {
    client,
    tablesDB: new TablesDB(client),
    Query,
  };
}
