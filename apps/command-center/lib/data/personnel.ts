import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getPersonnelData() {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("personnel")
    .select("*, profiles:user_id(full_name), stations:station_id(name), checkins(checkin_at, is_sos)")
    .order("role_title");

  return { personnel: data ?? [] };
}
