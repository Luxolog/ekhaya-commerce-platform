import { Account, Client, Functions, ID } from "appwrite";

export const APPWRITE_FUNCTION_ID = "ekhaya-marketplace-search";
export const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "6af62ccd0026265dd456";
export const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "https://fra.cloud.appwrite.io/v1";

const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const functions = new Functions(client);
export { ID };

export async function currentUser() {
  try { return await account.get(); } catch { return null; }
}

export async function invokeEkhayaFunction(payload: Record<string, unknown>) {
  // Appwrite's SDK defaults Function executions to POST; omitting the method
  // avoids passing an untyped string where the SDK expects ExecutionMethod.
  const execution = await functions.createExecution(
    APPWRITE_FUNCTION_ID,
    JSON.stringify(payload),
    false,
    "/"
  );
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(execution.responseBody || "{}");
  } catch {
    throw new Error("The Ekhaya service returned an unreadable response.");
  }
  if (execution.responseStatusCode < 200 || execution.responseStatusCode >= 300) {
    throw new Error(
      typeof body.error === "string"
        ? body.error
        : `Ekhaya service returned HTTP ${execution.responseStatusCode}.`
    );
  }
  return body;
}

export async function signOutAppwrite() {
  try { await account.deleteSession("current"); } catch { /* already signed out */ }
}
