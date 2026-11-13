import { Client, Query, TablesDB } from "node-appwrite";

export function createAppwriteAdminClient(env = process.env) {
  const endpoint = env.APPWRITE_FUNCTION_API_ENDPOINT;
  const projectId = env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = env.APPWRITE_API_KEY;

  if (!endpoint || !projectId || !apiKey) {
    throw new Error("Appwrite server configuration is incomplete");
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
