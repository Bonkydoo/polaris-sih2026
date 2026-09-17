// Pure decision logic for the Weather Contingency Planner agent — see
// reorder-forecaster/logic.ts for why this is split from index.ts.

export const RISK_THRESHOLD = 60;

export function contingencySeverity(riskScore: number): "critical" | "watch" {
  return riskScore >= 80 ? "critical" : "watch";
}

export function shouldDraftContingency(shipmentCount: number, affectedPoCount: number): boolean {
  return shipmentCount > 0 || affectedPoCount > 0;
}
