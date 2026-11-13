import { Account, Client, ID } from "appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "https://fra.cloud.appwrite.io/v1";
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "6af62ccd0026265dd456";

const client = new Client().setEndpoint(endpoint).setProject(projectId);

export const account = new Account(client);
export { ID };

export async function currentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

export async function signOutAppwrite() {
  try {
    await account.deleteSession("current");
  } catch {
    // An already expired session is equivalent to signed out.
  }
}
