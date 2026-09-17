import { describe, expect, it } from "vitest";
import { daysRemaining, isCriticalStock, packingDeadlineFor, reorderQuantity, reorderSeverity } from "./logic.ts";

describe("daysRemaining", () => {
  it("divides quantity by the daily consumption rate", () => {
    expect(daysRemaining(100, 10)).toBe(10);
  });

  it("returns Infinity when consumption rate is zero", () => {
    expect(daysRemaining(100, 0)).toBe(Infinity);
  });

  it("returns Infinity when consumption rate is negative (bad data guard)", () => {
    expect(daysRemaining(100, -5)).toBe(Infinity);
  });
});

describe("isCriticalStock", () => {
  it("flags critical when days remaining is at or below 75% of the threshold", () => {
    expect(isCriticalStock(15, 20)).toBe(true); // 15 <= 15
    expect(isCriticalStock(14, 20)).toBe(true);
  });

  it("does not flag critical above 75% of the threshold", () => {
    expect(isCriticalStock(16, 20)).toBe(false);
  });
});

describe("reorderQuantity", () => {
  it("sizes the reorder to two threshold-periods of consumption minus current stock", () => {
    // 10/day * 20-day threshold * 2 = 400 target buffer; 50 on hand -> 350
    expect(reorderQuantity(10, 20, 50)).toBe(350);
  });

  it("never goes negative when current stock already exceeds the target buffer", () => {
    expect(reorderQuantity(1, 5, 1000)).toBe(0);
  });

  it("rounds to the nearest whole unit", () => {
    expect(reorderQuantity(3, 7, 10)).toBe(Math.round(3 * 7 * 2 - 10));
  });
});

describe("packingDeadlineFor", () => {
  const now = new Date("2026-09-17T00:00:00.000Z");

  it("sets the deadline 5 days before stock runs out", () => {
    const deadline = packingDeadlineFor(20, now, null);
    expect(deadline.getTime() - now.getTime()).toBe(15 * 86400000);
  });

  it("never schedules less than 1 day out even if stock runs out imminently", () => {
    const deadline = packingDeadlineFor(2, now, null);
    expect(deadline.getTime() - now.getTime()).toBe(1 * 86400000);
  });

  it("clamps to the expedition window close if that comes sooner", () => {
    const windowClose = "2026-09-20T00:00:00.000Z";
    const deadline = packingDeadlineFor(20, now, windowClose); // unclamped would be 15 days out
    expect(deadline.toISOString()).toBe(new Date(windowClose).toISOString());
  });

  it("ignores the expedition window when it closes after the natural deadline", () => {
    const windowClose = "2027-01-01T00:00:00.000Z";
    const deadline = packingDeadlineFor(20, now, windowClose);
    expect(deadline.getTime() - now.getTime()).toBe(15 * 86400000);
  });
});

describe("reorderSeverity", () => {
  it("is critical at or below 50% of the reorder threshold", () => {
    expect(reorderSeverity(10, 20)).toBe("critical");
    expect(reorderSeverity(9, 20)).toBe("critical");
  });

  it("is watch above 50% of the threshold", () => {
    expect(reorderSeverity(11, 20)).toBe("watch");
  });
});
