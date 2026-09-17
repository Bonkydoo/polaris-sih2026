import { describe, expect, it } from "vitest";
import { cargoSeverity, classifyCargoItems, type CargoItem } from "./logic.ts";

const item = (overrides: Partial<CargoItem>): CargoItem => ({
  id: "1",
  name: "Item",
  quantity: 10,
  unit: "units",
  received_quantity: 10,
  ...overrides,
});

describe("classifyCargoItems", () => {
  it("classifies matching received quantity as neither mismatched nor unchecked", () => {
    const { mismatched, unchecked } = classifyCargoItems([item({ quantity: 10, received_quantity: 10 })]);
    expect(mismatched).toHaveLength(0);
    expect(unchecked).toHaveLength(0);
  });

  it("flags a shortfall as mismatched", () => {
    const { mismatched } = classifyCargoItems([item({ quantity: 10, received_quantity: 7 })]);
    expect(mismatched).toHaveLength(1);
  });

  it("flags an overage as mismatched too", () => {
    const { mismatched } = classifyCargoItems([item({ quantity: 10, received_quantity: 12 })]);
    expect(mismatched).toHaveLength(1);
  });

  it("treats a null received_quantity as unchecked, not mismatched", () => {
    const { mismatched, unchecked } = classifyCargoItems([item({ quantity: 10, received_quantity: null })]);
    expect(mismatched).toHaveLength(0);
    expect(unchecked).toHaveLength(1);
  });

  it("treats a received_quantity of exactly 0 as mismatched, not unchecked", () => {
    // 0 is falsy but must not be confused with null - a real shortfall to zero.
    const { mismatched, unchecked } = classifyCargoItems([item({ quantity: 10, received_quantity: 0 })]);
    expect(mismatched).toHaveLength(1);
    expect(unchecked).toHaveLength(0);
  });
});

describe("cargoSeverity", () => {
  it("is critical when any item is mismatched", () => {
    expect(cargoSeverity(1)).toBe("critical");
  });

  it("is watch when nothing is mismatched (only unchecked items)", () => {
    expect(cargoSeverity(0)).toBe("watch");
  });
});
