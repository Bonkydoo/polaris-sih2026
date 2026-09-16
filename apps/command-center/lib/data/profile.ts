import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Tables } from "@polaris/supabase-client";

export type Profile = Tables<"profiles">;

/**
 * Every protected page calls this first. proxy.ts already redirects an
 * unauthenticated request to /login, so reaching here without a session
 * would mean the cookie vanished between the proxy check and this render
 * — redirect again rather than throw.
 */
export async function requireProfile(): Promise<Profile> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (error || !profile) redirect("/login");

  return profile;
}
