import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getPurchaseOrders() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("purchase_orders")
    .select("*, purchase_requisitions(items, stations:station_id(name))")
    .order("packing_deadline");
  return data ?? [];
}

export async function getVendor() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("vendor_id").eq("id", user.id).single();
  if (!profile?.vendor_id) return null;

  const { data: vendor } = await supabase.from("vendors").select("*").eq("id", profile.vendor_id).single();
  return vendor;
}
