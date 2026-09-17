// Pure decision logic for the Cargo Reconciliation agent — see
// reorder-forecaster/logic.ts for why this is split from index.ts.

export type CargoItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  received_quantity: number | null;
};

export function classifyCargoItems(items: CargoItem[]): { mismatched: CargoItem[]; unchecked: CargoItem[] } {
  const mismatched = items.filter((i) => i.received_quantity !== null && i.received_quantity !== i.quantity);
  const unchecked = items.filter((i) => i.received_quantity === null);
  return { mismatched, unchecked };
}

export function cargoSeverity(mismatchedCount: number): "critical" | "watch" {
  return mismatchedCount > 0 ? "critical" : "watch";
}
