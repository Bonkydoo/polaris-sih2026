import type { Tables } from "@polaris/supabase-client";

export type InventoryStatus = "ok" | "watch" | "critical";

/**
 * Station and inventory status are deliberately not stored columns — a
 * cached "status" field goes stale the moment consumption is logged.
 * Days remaining, and the status band it falls into, is computed here
 * from quantity / consumption_rate_per_day every time it's needed. This
 * is exactly the calculation the Reorder Forecaster agent (next phase)
 * automates on a schedule; today it just runs inline at render time.
 */
export function daysRemaining(item: Pick<Tables<"inventory">, "quantity" | "consumption_rate_per_day">) {
  if (item.consumption_rate_per_day <= 0) return Infinity;
  return item.quantity / item.consumption_rate_per_day;
}

export function inventoryStatus(
  item: Pick<Tables<"inventory">, "quantity" | "consumption_rate_per_day" | "reorder_threshold_days">
): InventoryStatus {
  const days = daysRemaining(item);
  if (days <= item.reorder_threshold_days * 0.75) return "critical";
  if (days <= item.reorder_threshold_days) return "watch";
  return "ok";
}

export function stationStatus(
  inventoryAtStation: Tables<"inventory">[],
  hasOpenHighSeverityIncident: boolean
): InventoryStatus {
  if (hasOpenHighSeverityIncident) return "critical";
  const statuses = inventoryAtStation.map(inventoryStatus);
  if (statuses.includes("critical")) return "critical";
  if (statuses.includes("watch")) return "watch";
  return "ok";
}

export function daysUntil(dateStr: string) {
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
