// Pure decision logic for the Report Drafter agent — see
// reorder-forecaster/logic.ts for why this is split from index.ts.

export function isFlaggedForReorder(
  quantity: number,
  consumptionRatePerDay: number,
  reorderThresholdDays: number
): boolean {
  const days = consumptionRatePerDay > 0 ? quantity / consumptionRatePerDay : Infinity;
  return days <= reorderThresholdDays;
}

export function countByStatus(items: { status: string }[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});
}
