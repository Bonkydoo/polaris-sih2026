import { createServerSupabaseClient } from "@/lib/supabase/server";
import { stationStatus } from "@/lib/derive";
import type { Tables } from "@polaris/supabase-client";

export type StationWithStatus = Tables<"stations"> & {
  personnelOnStation: number;
  status: ReturnType<typeof stationStatus>;
};

export async function getOverviewData() {
  const supabase = await createServerSupabaseClient();

  const [expeditionRes, stationsRes, inventoryRes, shipmentsRes, personnelRes, incidentsRes] =
    await Promise.all([
      supabase.from("expeditions").select("*").eq("status", "active").limit(1).maybeSingle(),
      supabase.from("stations").select("*").order("name"),
      supabase.from("inventory").select("*"),
      supabase.from("shipments").select("*, stations:destination_station_id(name)").order("eta"),
      supabase.from("personnel").select("id, station_id"),
      supabase.from("incidents").select("station_id, severity").eq("status", "open"),
    ]);

  const expedition = expeditionRes.data;
  const stations = stationsRes.data ?? [];
  const inventory = inventoryRes.data ?? [];
  const shipments = shipmentsRes.data ?? [];
  const personnel = personnelRes.data ?? [];
  const incidents = incidentsRes.data ?? [];

  const stationsWithStatus: StationWithStatus[] = stations.map((s) => {
    const stationInventory = inventory.filter((i) => i.station_id === s.id);
    const hasHighSeverityIncident = incidents.some(
      (inc) => inc.station_id === s.id && (inc.severity === "high" || inc.severity === "critical")
    );
    return {
      ...s,
      personnelOnStation: personnel.filter((p) => p.station_id === s.id).length,
      status: stationStatus(stationInventory, hasHighSeverityIncident),
    };
  });

  return { expedition, stations: stationsWithStatus, inventory, shipments };
}
