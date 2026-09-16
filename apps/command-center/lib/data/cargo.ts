import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getCargoData() {
  const supabase = await createServerSupabaseClient();

  const [purchaseOrdersRes, shipmentsRes, vendorsRes] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select("*, vendors(name), purchase_requisitions(station_id, stations(name))")
      .order("packing_deadline"),
    supabase.from("shipments").select("*, stations:destination_station_id(name)").order("eta"),
    supabase.from("vendors").select("*").order("name"),
  ]);

  return {
    purchaseOrders: purchaseOrdersRes.data ?? [],
    shipments: shipmentsRes.data ?? [],
    vendors: vendorsRes.data ?? [],
  };
}
