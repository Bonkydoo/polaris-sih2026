// Service-role Supabase client for Edge Functions. Bypasses RLS — this
// is the trusted, server-side half of the system; every agent writes
// through here, never through a user-scoped client.
import { createClient } from "npm:@supabase/supabase-js@2";

export function supabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
