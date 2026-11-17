import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Server-side Supabase admin configuration is missing. Set SUPABASE_SERVICE_ROLE_KEY in the server environment.");
  }
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function listAllAuthUsers() {
  const client = createAdminClient();
  const users = [];
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("Unable to load the staff directory: " + error.message);
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}
