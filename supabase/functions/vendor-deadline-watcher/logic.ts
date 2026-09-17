// Pure decision logic for the Vendor Deadline Watcher agent — see
// reorder-forecaster/logic.ts for why this is split from index.ts.

export function daysToDeadline(packingDeadline: string | Date, today: Date): number {
  const deadline = typeof packingDeadline === "string" ? new Date(packingDeadline) : packingDeadline;
  return Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
}

export function isTrendingLate(committedDeliveryDate: string | null, packingDeadline: string | Date): boolean {
  if (!committedDeliveryDate) return true;
  const committed = new Date(committedDeliveryDate);
  const deadline = typeof packingDeadline === "string" ? new Date(packingDeadline) : packingDeadline;
  return committed > deadline;
}

export function poEscalationStatus(trendingLate: boolean, alreadyMissed: boolean): "late" | "at-risk" | null {
  if (alreadyMissed) return "late";
  if (trendingLate) return "at-risk";
  return null;
}

export function poEscalationSeverity(alreadyMissed: boolean): "critical" | "watch" {
  return alreadyMissed ? "critical" : "watch";
}
