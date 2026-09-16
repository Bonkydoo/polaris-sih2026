"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function reviewAgentRun(id: string, status: "approved" | "dismissed") {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("ai_agent_runs")
    .update({ status, reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/ai-activity");
}
