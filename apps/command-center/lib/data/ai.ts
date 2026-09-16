import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getAgentRuns() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("ai_agent_runs").select("*").order("created_at", { ascending: false });
  return data ?? [];
}
