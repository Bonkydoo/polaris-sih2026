// Pure decision logic for the Safety Escalation agent — see
// reorder-forecaster/logic.ts for why this is split from index.ts.

export function hoursSinceCheckin(lastCheckinAt: string | null, now: Date): number {
  if (!lastCheckinAt) return Infinity;
  return (now.getTime() - new Date(lastCheckinAt).getTime()) / 3600000;
}

export function isMissedCheckin(hoursSince: number, thresholdHours: number): boolean {
  return hoursSince >= thresholdHours;
}

export function missedCheckinSeverity(hoursSince: number): "critical" | "high" {
  return hoursSince > 24 ? "critical" : "high";
}
