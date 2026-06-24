// Shared Supabase client helper for Supabase Edge Functions (Deno).
// Uses the service-role key (auto-injected by the Supabase platform) to bypass
// RLS. Used only by process-image-queue (the cron-triggered, self-contained
// queue consumer that writes to the DB and Storage).

import { createClient } from "npm:@supabase/supabase-js";

export function getSupabaseClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url) {
    throw new Error("SUPABASE_URL is not set");
  }
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
