// Pure decision logic for the Reorder Forecaster agent, split out from
// index.ts so it can be unit tested under Node/vitest without a Deno
// runtime or a live Supabase connection. No Deno-specific APIs here.

export function daysRemaining(quantity: number, ratePerDay: number): number {
  if (ratePerDay <= 0) return Infinity;
  return quantity / ratePerDay;
}

export function isCriticalStock(days: number, reorderThresholdDays: number): boolean {
  return days <= reorderThresholdDays * 0.75;
}

export function reorderQuantity(
  consumptionRatePerDay: number,
  reorderThresholdDays: number,
  currentQuantity: number
): number {
  return Math.max(0, Math.round(consumptionRatePerDay * reorderThresholdDays * 2 - currentQuantity));
}

export function packingDeadlineFor(days: number, now: Date, expeditionWindowClose?: string | null): Date {
  const deadline = new Date(now.getTime() + Math.max(1, Math.floor(days) - 5) * 86400000);
  if (expeditionWindowClose) {
    const windowClose = new Date(expeditionWindowClose);
    if (windowClose < deadline) deadline.setTime(windowClose.getTime());
  }
  return deadline;
}

export function reorderSeverity(days: number, reorderThresholdDays: number): "critical" | "watch" {
  return days <= reorderThresholdDays * 0.5 ? "critical" : "watch";
}
