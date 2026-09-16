import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getInventoryData() {
  const supabase = await createServerSupabaseClient();

  const [stationsRes, inventoryRes] = await Promise.all([
    supabase.from("stations").select("*").order("name"),
    supabase.from("inventory").select("*").order("name"),
  ]);

  return {
    stations: stationsRes.data ?? [],
    inventory: inventoryRes.data ?? [],
  };
}
