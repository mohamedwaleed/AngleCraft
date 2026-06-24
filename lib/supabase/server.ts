import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-side Supabase client using the service-role key.
// AngleCraft uses custom anonymous sessions (no Supabase Auth), and all DB
// access happens in route handlers / Server Components with the service-role
// key, which bypasses RLS. The anon key is only used in the browser client
// (lib/supabase/client.ts) and in proxy.ts for auth-session refresh.

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
