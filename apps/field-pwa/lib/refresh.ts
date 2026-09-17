import { supabase } from "./supabase";
import { db, setMeta } from "./db";

// Pulls fresh data into the local cache. RLS already scopes every one of
// these queries to the signed-in field user's own station — there's no
// station_id filter here because there doesn't need to be one; asking
// Supabase for "all inventory" as a field user already returns only
// theirs.
export async function refreshCache(): Promise<{ ok: boolean; error?: string }> {
  if (!navigator.onLine) return { ok: false, error: "offline" };

  try {
    const [inventoryRes, personnelRes, shipmentsRes] = await Promise.all([
      supabase.from("inventory").select("*"),
      supabase.from("personnel").select("*, profiles:user_id(full_name), stations:station_id(name)"),
      supabase.from("shipments").select("*"),
    ]);

    if (inventoryRes.error) throw inventoryRes.error;
    if (personnelRes.error) throw personnelRes.error;
    if (shipmentsRes.error) throw shipmentsRes.error;

    await db.transaction("rw", db.inventory, db.personnel, db.shipments, db.meta, async () => {
      await db.inventory.clear();
      await db.inventory.bulkAdd(inventoryRes.data);

      await db.personnel.clear();
      await db.personnel.bulkAdd(
        personnelRes.data.map((p) => ({
          ...p,
          full_name: (p.profiles as { full_name: string } | null)?.full_name ?? null,
          station_name: (p.stations as { name: string } | null)?.name ?? null,
        }))
      );

      await db.shipments.clear();
      await db.shipments.bulkAdd(shipmentsRes.data);
    });

    await setMeta("lastSyncAt", new Date().toISOString());
    return { ok: true };
  } catch (err) {
    console.error("refreshCache failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "unknown error" };
  }
}
